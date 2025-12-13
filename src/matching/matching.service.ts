// src\matching\matching.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  //ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Registration,
  RegistrationDocument,
} from './schema/registration.schema';
import { RegisterProgramDto } from './dto/register-program.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { User, UserRole, UserDocument } from '@/user/schema/user.schema';
import { Course, CourseDocument } from '@/course/schema/course.schema';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import {
  Material,
  MaterialDocument,
} from '@/materials/schema/materials.schema';
import { AddSessionDto } from './dto/add-session.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

type Session = {
  day: string;
  startTime: string;
  endTime: string;
  form?: string;
  location?: string;
  studentAttemp?: string[];
};
type TimeSlot = { day: string; start: number; end: number };

interface StudentLean {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  studentId?: string;
  subjects?: {
    Subject: string;
    scores: Record<string, number>;
    finalScore?: number;
  }[];
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,

    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
  ) {}

  /* -------------------
     Helper utilities
     ------------------- */

  private parseHHMM(hhmm: string): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (
      Number.isNaN(h) ||
      Number.isNaN(mm) ||
      h < 0 ||
      h > 23 ||
      mm < 0 ||
      mm > 59
    )
      return null;
    return h * 60 + mm;
  }

  private sessionsToSlots(sessions: Session[]): (TimeSlot | null)[] {
    return sessions.map((s) => {
      const start = this.parseHHMM(s.startTime);
      const end = this.parseHHMM(s.endTime);
      if (start === null || end === null) return null;
      return { day: s.day.trim().toLowerCase(), start, end };
    });
  }

  /**
   * Validate sessions: start < end, no duplicate days, no overlaps inside array
   */
  private validateSessionsOrThrow(sessions: Session[]) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      throw new BadRequestException('No sessions provided');
    }

    const slots = this.sessionsToSlots(sessions);
    if (slots.some((s) => s === null)) {
      throw new BadRequestException(
        'Invalid session time format. Use "HH:MM".',
      );
    }

    const seenDays = new Map<string, TimeSlot[]>();
    for (const s of slots as TimeSlot[]) {
      if (s.start >= s.end) {
        throw new BadRequestException(
          `Session startTime must be before endTime (day=${s.day}, ${s.start} >= ${s.end})`,
        );
      }
      const arr = seenDays.get(s.day) || [];
      // check overlap with existing on same day
      for (const other of arr) {
        if (s.start < other.end && other.start < s.end) {
          throw new BadRequestException(
            `Overlapping sessions on ${s.day}: ${s.start} - ${s.end} conflicts with ${other.start} - ${other.end}`,
          );
        }
      }
      arr.push(s);
      seenDays.set(s.day, arr);
    }
  }

  /**
   * Check overlap between two session arrays (used for tutor conflict checking).
   * Returns true when any overlap exists.
   */
  private sessionsOverlap(a: Session[], b: Session[]) {
    const aSlots = this.sessionsToSlots(a).filter(Boolean) as TimeSlot[];
    const bSlots = this.sessionsToSlots(b).filter(Boolean) as TimeSlot[];

    for (const x of aSlots) {
      for (const y of bSlots) {
        if (x.day !== y.day) continue;
        if (x.start < y.end && y.start < x.end) return true;
      }
    }
    return false;
  }

  /* -------------------
     Core business methods
     ------------------- */

  /**
   * Register a student into a class group (atomic when registration exists).
   * Business rules enforced:
   *  - course must exist
   *  - classGroup must be listed in course.classGroups
   *  - registration period must be active
   *  - student must exist and have role STUDENT
   *  - student cannot be registered in another class group of the same course
   *  - class capacity respected
   *  - duplicate registration prevented
   */

  async registerStudent(studentId: string, dto: RegisterProgramDto) {
    const registration = await this.registrationModel.findById(
      dto.registrationId,
    );
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    const course = await this.courseModel.findById(registration.course);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const now = new Date();

    console.log('---- DEBUG REGISTRATION PERIOD CHECK ----');
    console.log('now =', now.toISOString());
    console.log('course.registrationStart =', course.registrationStart);
    console.log('course.registrationEnd   =', course.registrationEnd);
    console.log('start < now? =', now < course.registrationStart);
    console.log('now > end?   =', now > course.registrationEnd);
    console.log('-----------------------------------------');

    if (now < course.registrationStart || now > course.registrationEnd) {
      throw new BadRequestException('Registration period is not active');
    }

    const student = await this.userModel.findById(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      throw new BadRequestException('Invalid student user');
    }

    // Check if student already registered in ANY classGroup of the same course
    const conflict = await this.registrationModel.findOne({
      course: registration.course,
      students: student.email,
      _id: { $ne: registration._id },
    });

    if (conflict) {
      throw new ConflictException(
        `Student already registered in class group ${conflict.classGroup}`,
      );
    }

    // Check capacity
    if (registration.registeredCount >= course.capacity) {
      throw new BadRequestException('Class is full');
    }

    // Prevent duplicate
    if (registration.students.includes(student.email)) {
      throw new BadRequestException('Student already registered');
    }

    // Update atomic
    registration.students.push(student.email);
    registration.registeredCount += 1;
    await registration.save();

    return {
      message: 'Student successfully registered',
      registration,
    };
  }

  /**
   * Unregister student from class group.
   * Rules:
   *  - course must exist
   *  - unregister only allowed during registration period
   *  - student must currently be registered in that registration doc
   *  - operation is atomic
   */
  async unregisterStudent(studentId: string, registrationId: string) {
    if (!Types.ObjectId.isValid(registrationId)) {
      throw new BadRequestException('Invalid registrationId.');
    }

    const registration = await this.registrationModel.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Registration not found.');
    }

    const course = await this.courseModel.findById(registration.course);
    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const student = await this.userModel.findById(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      throw new BadRequestException('Invalid student user');
    }

    if (!registration.students.includes(student.email)) {
      throw new BadRequestException(
        'Student is not registered in this class group.',
      );
    }

    const now = new Date();
    if (
      now < new Date(course.registrationStart) ||
      now > new Date(course.registrationEnd)
    ) {
      throw new BadRequestException(
        'You can only unregister during the registration period.',
      );
    }

    // atomic update
    const updated = await this.registrationModel.findByIdAndUpdate(
      registrationId,
      {
        $pull: { students: student.email },
        $inc: { registeredCount: -1 },
      },
      { new: true },
    );

    return {
      message: 'Student successfully unregistered',
      registration: updated,
    };
  }

  /**
   * Tutor sets schedule for their assigned course/classGroup.
   * Rules enforced:
   *  - registration exists and tutor is assigned to that class group
   *  - provided sessions are valid (start < end, no duplicate/overlaps)
   *  - tutor has no schedule conflicts with other assigned class groups
   */
  async setSchedule(tutorId: string, dto: SetScheduleDto) {
    // validate registration exists and tutor is assigned
    const registration = await this.registrationModel.findOne({
      course: dto.registrationId,
      classGroup: dto.classGroup,
      tutor: tutorId,
    });

    if (!registration)
      throw new NotFoundException('You are not assigned to this class group');

    // Validate sessions structure & intra-session rules
    this.validateSessionsOrThrow(dto.sessions);

    // Check tutor conflicts: find other registrations where tutor is assigned and sessions overlap
    const otherRegs = await this.registrationModel
      .find({
        tutor: tutorId,
        _id: { $ne: registration._id },
        sessions: { $exists: true },
      })
      .lean();

    for (const other of otherRegs) {
      if (
        other.sessions &&
        this.sessionsOverlap(other.sessions as Session[], dto.sessions)
      ) {
        throw new BadRequestException(
          `Schedule conflicts with tutor's other class group (${other.courseCode} / ${other.classGroup})`,
        );
      }
    }

    // Save sessions
    registration.sessions = dto.sessions.map((s) => ({
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      form: s.form ?? '',
      location: s.location ?? '',
      studentAttemp: s.studentAttemp ?? [],
    }));

    await registration.save();

    return {
      message: 'Schedule successfully set',
      schedule: registration.sessions,
    };
  }

  /* -------------------
     Query helpers
     ------------------- */

  /**
   * Get all registrations (for admin or tutor)
   */
  async getAllRegistrations() {
    return this.registrationModel.find().lean();
  }

  async getRegistrationsFiltered(
    courseId?: string,
    courseCode?: string,
    classGroup?: string,
  ) {
    const filter: any = {};

    // Prefer courseId if present
    if (courseId && Types.ObjectId.isValid(courseId)) {
      filter.course = new Types.ObjectId(courseId);
    } else if (courseCode) {
      filter.courseCode = courseCode;
    }

    if (classGroup) filter.classGroup = classGroup;

    return this.registrationModel.find(filter).lean();
  }

  /**
   * Get student’s registered courses
   */
  async getStudentRegistrations(studentId: string) {
    return this.registrationModel.find({ students: studentId }).lean();
  }

  /**
   * Get tutor’s assigned courses
   */
  async getTutorCourses(tutorId: string) {
    // Return registration documents (rosters) where tutor is assigned
    return this.registrationModel.find({ tutor: tutorId }).lean();
  }

  async updateRegistration(registrationId: string, dto: UpdateRegistrationDto) {
    const registration = await this.registrationModel.findById(registrationId);
    if (!registration) throw new NotFoundException('Registration not found');

    if (dto.tutor !== undefined) {
      const tutor = await this.userModel.findById(dto.tutor);
      if (!tutor || tutor.role !== UserRole.TUTOR) {
        throw new BadRequestException('Invalid tutor ID');
      }
      registration.tutor = dto.tutor;
    }
    await registration.save();
    return { message: 'Registration updated successfully', registration };
  }

  async deleteRegistrationByCourseGroup(
    courseCode: string,
    classGroup: string,
  ) {
    const reg = await this.registrationModel.findOne({
      courseCode,
      classGroup,
    });
    if (!reg) throw new NotFoundException('Registration not found');

    // Optionally: delete course info if needed
    await reg.deleteOne();
    return { message: 'Deleted successfully' };
  }

  async getClassFromUserId(id: string) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const filter: any = {};

    if (user.role === UserRole.STUDENT) {
      if (!user.email) return [];
      filter.students = user.email;
    } else if (user.role === UserRole.TUTOR) {
      if (!user._id.toString()) return [];
      filter.tutor = user._id.toString();
    } else {
      return [];
    }

    const registrationList = await this.registrationModel.find(filter).lean();
    const mergeResult = await Promise.all(
      registrationList.map(async (registration) => {
        const course = await this.courseModel
          .findOne({
            courseCode: registration.courseCode,
          })
          .lean();

        return {
          ...registration,
          course: course || null, // gộp thêm course
        };
      }),
    );

    return mergeResult;
  }

  async getClassDetailFromId(id: string) {
    // 1. Lấy thông tin Registration
    const registration = await this.registrationModel.findById(id).lean();
    if (!registration) {
      return null; // Hoặc throw NotFoundException
    }

    // 2. Lấy thông tin Course song song (hoặc tuần tự tùy logic)
    const course = await this.courseModel
      .findOne({
        courseCode: registration.courseCode,
      })
      .lean();

    // 3. Xử lý Populate Materials thủ công
    // Lấy object materials ra (có thể null nên cần default)
    const matObj = registration.materials || {
      general: [],
      reference: [],
      slide: [],
    };

    // Gom tất cả ID lại thành 1 mảng duy nhất để query 1 lần
    const allMaterialIds = [
      ...(matObj.general || []),
      ...(matObj.reference || []),
      ...(matObj.slide || []),
    ];

    let populatedMaterials = {
      general: [],
      reference: [],
      slide: [],
    };

    // Chỉ query nếu có ít nhất 1 ID
    if (allMaterialIds.length > 0) {
      // Tìm tất cả Material có ID nằm trong danh sách
      const fetchedMaterials = await this.materialModel
        .find({
          _id: { $in: allMaterialIds },
        })
        .lean();

      // Tạo Map để tìm kiếm nhanh (O(1)) theo ID
      // Key: ID string, Value: Material Object
      const materialMap = new Map(
        fetchedMaterials.map((m) => [m._id.toString(), m]),
      );

      // Map ngược lại vào cấu trúc ban đầu
      populatedMaterials = {
        general: (matObj.general || [])
          .map((id) => materialMap.get(id.toString()))
          .filter(Boolean),
        reference: (matObj.reference || [])
          .map((id) => materialMap.get(id.toString()))
          .filter(Boolean),
        slide: (matObj.slide || [])
          .map((id) => materialMap.get(id.toString()))
          .filter(Boolean),
      };
    }

    // 4. Trả về kết quả đã gộp
    return {
      ...registration,
      course: course || null,
      materials: populatedMaterials, // Ghi đè materials cũ bằng materials đã có full thông tin
    };
  }

  // ... các imports hiện có

  // ... constructor giữ nguyên ...

  // ... (giữ nguyên các helper: parseHHMM, sessionsToSlots, validateSessionsOrThrow, sessionsOverlap) ...

  /* -------------------
     NEW FUNCTION: ADD SESSION
     ------------------- */
  async addSession(userId: string, userRole: UserRole, dto: AddSessionDto) {
    // 1. Tìm Registration (Lớp học phần)
    const registration = await this.registrationModel.findById(dto.courseId);
    if (!registration) {
      throw new NotFoundException('Class registration not found');
    }
    // const regId = (dto as any).registrationId;
    // if (!regId) throw new NotFoundException('Registration id not provided');
    // if (!Types.ObjectId.isValid(regId)) throw new BadRequestException('Invalid registrationId');

    // const registration = await this.registrationModel.findById(regId);
    // if (!registration) throw new NotFoundException('Class registration not found');

    // // Permission: Tutors can only add session to their assigned class; Admins allowed; Students not allowed
    // if (userRole === UserRole.TUTOR) {
    //   if (!registration.tutor || registration.tutor !== userId) {
    //     throw new ForbiddenException('You are not the assigned tutor for this class');
    //   }
    // } else if (userRole !== UserRole.ADMIN) {
    //   throw new ForbiddenException('Only Tutors or Admins can add sessions');
    // }

    // 3. Chuẩn bị object Session mới
    const newSession = {
      day: dto.day,
      startTime: dto.startTime,
      endTime: dto.endTime,
      form: dto.form ?? '',
      location: dto.location ?? '',
      studentAttemp: [], // Khởi tạo mảng điểm danh rỗng
    };

    // 4. Validate Logic Thời gian (Start < End)
    const startMin = this.parseHHMM(newSession.startTime);
    const endMin = this.parseHHMM(newSession.endTime);
    if (startMin === null || endMin === null)
      throw new BadRequestException('Invalid time format');
    if (startMin >= endMin)
      throw new BadRequestException('startTime must be before endTime');

    // 5. Kiểm tra trùng lịch TRONG CÙNG LỚP HỌC (Internal Conflict)
    // Không thể tạo 2 buổi học cùng giờ cho cùng 1 lớp
    const currentSessions = (registration.sessions || []) as Session[];
    // Tạo mảng tạm gồm session cũ + session mới để check overlap
    // Dùng hàm helper sessionsOverlap để so sánh session mới với từng session cũ
    if (this.sessionsOverlap([newSession], currentSessions)) {
      throw new BadRequestException(
        'This session overlaps with an existing session in this class',
      );
    }

    // check tutor conflicts (if tutor assigned)
    if (registration.tutor) {
      const tutorIdToCheck = registration.tutor;
      const otherRegs = await this.registrationModel
        .find({
          tutor: tutorIdToCheck,
          _id: { $ne: registration._id },
          sessions: { $exists: true, $ne: [] },
        })
        .lean();

      for (const other of otherRegs) {
        if (
          other.sessions &&
          this.sessionsOverlap([newSession], other.sessions as Session[])
        ) {
          throw new BadRequestException(
            `Schedule conflict: Tutor is teaching class "${other.courseCode} - ${other.classGroup}" at this time.`,
          );
        }
      }
    }

    // 6. Kiểm tra trùng lịch CỦA GIẢNG VIÊN (External Conflict)
    // Nếu có Tutor, phải đảm bảo Tutor không dạy lớp khác vào giờ này
    // if (registration.tutor) {
    //   const tutorIdToCheck = registration.tutor;

    //   // Tìm tất cả các lớp khác mà Tutor này đang dạy (trừ lớp hiện tại)
    //   const otherRegs = await this.registrationModel
    //     .find({
    //       tutor: tutorIdToCheck,
    //       _id: { $ne: registration._id }, // Loại trừ lớp hiện tại
    //       sessions: { $exists: true, $ne: [] },
    //     })
    //     .lean();

    //   for (const other of otherRegs) {
    //     if (
    //       other.sessions &&
    //       this.sessionsOverlap([newSession], other.sessions as Session[])
    //     ) {
    //       throw new BadRequestException(
    //         `Schedule conflict: Tutor is teaching class "${other.courseCode} - ${other.classGroup}" at this time.`,
    //       );
    //     }
    //   }
    // }

    // 7. Lưu vào Database
    // Sử dụng $push để thêm vào mảng sessions
    const updatedRegistration = await this.registrationModel.findByIdAndUpdate(
      dto.courseId,
      {
        $push: { sessions: newSession },
        // Nếu lớp chưa active và có session, có thể đổi status (tùy business logic)
      },
      { new: true }, // Trả về document sau khi update
    );

    return {
      message: 'Session added successfully',
      session: newSession,
      registration: updatedRegistration,
    };
  }

  async updateAttendance(
    userId: string,
    userRole: UserRole,
    dto: UpdateAttendanceDto,
  ) {
    const regId = dto.courseId;
    if (!regId) throw new NotFoundException('Registration id not provided');

    const registration = await this.registrationModel.findById(regId);
    if (!registration)
      throw new NotFoundException('Class registration not found');

    // Check session exists
    if (!registration.sessions || !registration.sessions[dto.sessionIndex]) {
      throw new BadRequestException('Session not found at this index');
    }

    const session = registration.sessions[dto.sessionIndex];

    if (!session.studentAttemp) {
      session.studentAttemp = [];
    }

    if (dto.isPresent) {
      // ADD studentId
      if (!session.studentAttemp.includes(dto.studentEmail)) {
        session.studentAttemp.push(dto.studentEmail);
      }
    } else {
      // REMOVE studentId
      session.studentAttemp = session.studentAttemp.filter(
        (email) => email !== dto.studentEmail,
      );
    }

    registration.markModified('sessions');
    await registration.save();

    return {
      message: 'Attendance updated successfully',
      updatedSession: session,
    };
  }

  async studentProgress(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid registration id');

    const registration = await this.registrationModel.findById(id).lean();
    if (!registration) throw new NotFoundException('Registration not found');

    const course = await this.courseModel
      .findOne({ courseCode: registration.courseCode })
      .lean();

    if (!course) return { ...registration, course: null, studentProgress: [] };

    // students stored as studentId (ObjectId strings)
    // const students = await this.userModel
    //   .find({ _id: { $in: registration.students } })
    //   .lean();

    // Cast the lean result to StudentLean[]

    const students = await this.userModel
      .find({
        email: { $in: registration.students },
      })
      .lean();

    const studentProgress = students.map((student) => {
      const subjectData = student.subjects?.find(
        (sub: any) => sub.Subject === course.courseName,
      );

      const profileData: any =
        student.subjects.find((sub: any) => sub.studentId) || {};

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        studentId: profileData.studentId || (student as any).studentId || 'N/A',
        scores: subjectData ? subjectData.scores : null,
      };
    });

    return { studentProgress: studentProgress };
  }
}
