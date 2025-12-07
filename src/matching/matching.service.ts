// src\matching\matching.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  // ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Registration,
  RegistrationDocument,
  RegistrationStatus,
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

type Session = { day: string; startTime: string; endTime: string };
type TimeSlot = { day: string; start: number; end: number };

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
    // validate course
    const course = await this.courseModel.findById(dto.course).lean();
    if (!course) throw new NotFoundException('Course not found');

    // validate classGroup exists on course
    if (
      !Array.isArray(course.classGroups) ||
      !course.classGroups.includes(dto.classGroup)
    ) {
      throw new BadRequestException('Invalid class group for this course');
    }

    // Ensure registration period is active
    const now = new Date();
    if (
      now < new Date(course.registrationStart) ||
      now > new Date(course.registrationEnd)
    ) {
      throw new BadRequestException(
        'Registration period is not active for this course',
      );
    }

    // Validate student exists and is actually a student
    const student = await this.userModel.findById(studentId).lean();
    if (!student) throw new NotFoundException('Student user not found');
    if ((student as any).role !== UserRole.STUDENT) {
      throw new BadRequestException('Only students can register for courses');
    }

    // Prevent student from being registered to another class group of same course
    const otherReg = await this.registrationModel.findOne({
      course: dto.course,
      students: studentId,
      classGroup: { $ne: dto.classGroup },
    });
    if (otherReg) {
      throw new ConflictException(
        `Student already registered in class group "${otherReg.classGroup}" for this course`,
      );
    }

    // Attempt atomic update if registration doc exists
    const registration = await this.registrationModel.findOne({
      course: dto.course,
      classGroup: dto.classGroup,
    });

    if (registration) {
      // Use findOneAndUpdate atomically: ensure student not present and registeredCount < capacity
      const updated = await this.registrationModel.findOneAndUpdate(
        {
          _id: registration._id,
          students: { $ne: studentId },
          registeredCount: { $lt: course.capacity || Number.MAX_SAFE_INTEGER },
        },
        {
          $push: { students: studentId },
          $inc: { registeredCount: 1 },
          // if status should become ACTIVE once at least one student registers:
          $set: { status: RegistrationStatus.ACTIVE },
        },
        { new: true },
      );

      if (!updated) {
        // If update failed, determine reason
        // check if student already present
        const existing = await this.registrationModel.findOne({
          _id: registration._id,
          students: studentId,
        });
        if (existing)
          throw new BadRequestException(
            'Student already registered for this class group',
          );

        // otherwise capacity likely full
        throw new BadRequestException('Class is already full');
      }

      return {
        message: 'Student successfully registered',
        registration: updated,
      };
    }

    // If registration doc missing (fallback) create it (we assume up-front course creation usually creates them)
    const created = new this.registrationModel({
      course: dto.course,
      classGroup: dto.classGroup,
      students: [studentId],
      tutor: dto.tutor || null,
      sessions: [],
      registeredCount: 1,
      status: RegistrationStatus.ACTIVE,
    });
    await created.save();
    return {
      message: 'Student successfully registered (created registration)',
      registration: created,
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
  async unregisterStudent(
    studentId: string,
    courseId: string,
    classGroup: string,
  ) {
    const course = await this.courseModel.findById(courseId).lean();
    if (!course) throw new NotFoundException('Course not found');

    const now = new Date();
    if (
      now < new Date(course.registrationStart) ||
      now > new Date(course.registrationEnd)
    ) {
      throw new BadRequestException(
        'You can only unregister during the registration period',
      );
    }

    // atomic pull
    const updated = await this.registrationModel.findOneAndUpdate(
      {
        course: courseId,
        classGroup,
        students: studentId, // ensure present
      },
      {
        $pull: { students: studentId },
        $inc: { registeredCount: -1 },
      },
      { new: true },
    );

    if (!updated) {
      // determine reason
      const reg = await this.registrationModel.findOne({
        course: courseId,
        classGroup,
      });
      if (!reg) throw new NotFoundException('Registration not found');
      if (!reg.students.includes(studentId))
        throw new BadRequestException(
          'Student not registered in this class group',
        );
      // fallback
      throw new BadRequestException('Unable to unregister student');
    }

    // If after removal there are 0 students, optionally set status back to CREATED or TUTOR_ASSIGNED
    if ((updated.registeredCount || 0) <= 0) {
      // keep tutor assignment, but set status to TUTOR_ASSIGNED or CREATED depending on whether tutor exists
      updated.status = updated.tutor
        ? RegistrationStatus.TUTOR_ASSIGNED
        : RegistrationStatus.CREATED;
      await updated.save();
    }

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
      course: dto.courseId,
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
    registration.sessions = dto.sessions;
    // If tutor is assigned and sessions exist, set TUTOR_ASSIGNED or ACTIVE remains as is
    registration.status =
      registration.status === RegistrationStatus.ACTIVE
        ? RegistrationStatus.ACTIVE
        : RegistrationStatus.TUTOR_ASSIGNED;
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

  async getRegistrationsFiltered(courseCode?: string, classGroup?: string) {
    const filter: any = {};

    if (courseCode) filter.courseCode = courseCode;
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

  /* -------------------
     Admin operations
     ------------------- */

  /**
   * Assign a tutor to a classGroup.
   * Rules:
   *  - course & classGroup must exist
   *  - tutor must exist and have TUTOR role
   *  - optionally check current sessions for conflicts (if registration has sessions or other reg has sessions)
   */
  async assignTutor(tutorId: string, courseId: string, classGroup: string) {
    const course = await this.courseModel.findById(courseId).lean();
    if (!course) throw new NotFoundException('Course not found');

    // Validate classGroup
    if (
      !Array.isArray(course.classGroups) ||
      !course.classGroups.includes(classGroup)
    ) {
      throw new BadRequestException('Invalid class group for this course');
    }

    // Tutor validation
    const tutor = await this.userModel.findById(tutorId).lean();
    if (!tutor || tutor.role !== UserRole.TUTOR)
      throw new BadRequestException('Invalid tutor');

    // Load or create registration
    let registration = await this.registrationModel.findOne({
      course: courseId,
      classGroup,
    });
    if (!registration) {
      // Create new empty registration with tutor
      registration = new this.registrationModel({
        course: courseId,
        classGroup,
        tutor: tutorId,
        students: [],
        sessions: [],
        registeredCount: 0,
        status: RegistrationStatus.TUTOR_ASSIGNED,
      });
      await registration.save();
      return {
        message: 'Tutor assigned and registration created',
        registration,
      };
    }

    // If registration has sessions, ensure assigning tutor doesn't conflict with tutor's other schedules
    if (
      Array.isArray(registration.sessions) &&
      registration.sessions.length > 0
    ) {
      // find other regs for this tutor and check overlap
      const otherRegs = await this.registrationModel
        .find({ tutor: tutorId, _id: { $ne: registration._id } })
        .lean();
      for (const other of otherRegs) {
        if (
          other.sessions &&
          this.sessionsOverlap(
            other.sessions as Session[],
            registration.sessions as Session[],
          )
        ) {
          throw new BadRequestException(
            'Tutor schedule conflict with another assigned class group',
          );
        }
      }
    }

    registration.tutor = tutorId;
    registration.status =
      registration.registeredCount && registration.registeredCount > 0
        ? RegistrationStatus.ACTIVE
        : RegistrationStatus.TUTOR_ASSIGNED;
    await registration.save();

    return { message: 'Tutor assigned', registration };
  }

  /**
   * Unassign tutor from a class group (admin)
   */
  async unassignTutor(courseId: string, classGroup: string) {
    const registration = await this.registrationModel.findOne({
      course: courseId,
      classGroup,
    });
    if (!registration)
      throw new NotFoundException('Class group registration not found');

    registration.tutor = null;
    registration.sessions = [];
    registration.status =
      registration.registeredCount && registration.registeredCount > 0
        ? RegistrationStatus.ACTIVE
        : RegistrationStatus.CREATED;
    await registration.save();

    return { message: 'Tutor unassigned', registration };
  }

  async updateRegistration(registrationId: string, dto: UpdateRegistrationDto) {
    const registration = await this.registrationModel.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // Only update allowed fields
    if (dto.tutor !== undefined) {
      registration.tutor = dto.tutor;
    }

    if (dto.status !== undefined) {
      registration.status = dto.status as RegistrationStatus;
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
      if (!user.name) return [];
      filter.tutor = user.name;
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

  // async getClassDetailFromId(id: string) {
  //   const registration = await this.registrationModel.findById(id).lean();

  //   const course = await this.courseModel
  //     .findOne({
  //       courseCode: registration.courseCode,
  //     })
  //     .lean();

  //   return {
  //     ...registration,
  //     course: course || null, // gộp thêm course
  //   };
  // }
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

    // 2. Kiểm tra quyền hạn
    // Nếu là Tutor, bắt buộc phải là người được assign cho lớp này
    // if (userRole === UserRole.TUTOR) {
    //   // Lưu ý: registration.tutor lưu string (tên hoặc ID tùy logic assign), ở đây giả định lưu ID hoặc Name
    //   // Nếu lưu Name, bạn cần query User để lấy Name so sánh, hoặc lưu ID thống nhất.
    //   // Dựa vào code cũ: registration.tutor = tutorId.
    //   if (registration.tutor !== userId) {
    //     throw new ForbiddenException(
    //       'You are not the assigned tutor for this class',
    //     );
    //   }
    // }

    // 3. Chuẩn bị object Session mới
    const newSession = {
      day: dto.day,
      startTime: dto.startTime,
      endTime: dto.endTime,
      form: dto.form || '',
      location: dto.location || '',
      studentAttemp: [], // Khởi tạo mảng điểm danh rỗng
    };

    // 4. Validate Logic Thời gian (Start < End)
    const startMin = this.parseHHMM(newSession.startTime);
    const endMin = this.parseHHMM(newSession.endTime);
    if (startMin === null || endMin === null) {
      throw new BadRequestException('Invalid time format');
    }
    if (startMin >= endMin) {
      throw new BadRequestException('startTime must be before endTime');
    }

    // 5. Kiểm tra trùng lịch TRONG CÙNG LỚP HỌC (Internal Conflict)
    // Không thể tạo 2 buổi học cùng giờ cho cùng 1 lớp
    const currentSessions = registration.sessions || [];
    // Tạo mảng tạm gồm session cũ + session mới để check overlap
    // Dùng hàm helper sessionsOverlap để so sánh session mới với từng session cũ
    if (this.sessionsOverlap([newSession], currentSessions)) {
      throw new BadRequestException(
        'This session overlaps with an existing session in this class',
      );
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
    // 1. Tìm lớp học
    const registration = await this.registrationModel.findById(dto.courseId);
    if (!registration) {
      throw new NotFoundException('Class registration not found');
    }

    // // 2. Check quyền (Nếu là Tutor thì phải đúng người dạy)
    // if (userRole === UserRole.TUTOR && registration.tutor !== userId) {
    //   throw new ForbiddenException(
    //     'You are not the assigned tutor for this class',
    //   );
    // }

    // 3. Kiểm tra session có tồn tại không
    if (!registration.sessions || !registration.sessions[dto.sessionIndex]) {
      throw new BadRequestException('Session not found at this index');
    }

    // 4. Lấy session ra xử lý
    const session = registration.sessions[dto.sessionIndex];

    // Đảm bảo mảng studentAttemp tồn tại
    if (!session.studentAttemp) {
      session.studentAttemp = [];
    }

    if (dto.isPresent) {
      // Logic: ADD (Nếu chưa có thì thêm vào)
      if (!session.studentAttemp.includes(dto.studentEmail)) {
        session.studentAttemp.push(dto.studentEmail);
      }
    } else {
      // Logic: REMOVE (Lọc bỏ email ra khỏi mảng)
      session.studentAttemp = session.studentAttemp.filter(
        (email) => email !== dto.studentEmail,
      );
    }

    // 5. Lưu thay đổi vào DB
    // Vì Mongoose phát hiện thay đổi trong sub-document array đôi khi khó khăn,
    // ta dùng markModified để chắc chắn.
    registration.markModified('sessions');
    await registration.save();

    return {
      message: 'Attendance updated successfully',
      updatedSession: session,
    };
  }

  // async studentProgress(id: string) {
  //   const registration = await this.registrationModel.findById(id).lean();

  //   const course = await this.courseModel
  //     .findOne({
  //       courseCode: registration.courseCode,
  //     })
  //     .lean();

  //   return {
  //     ...registration,
  //     course: course || null, // gộp thêm course
  //   };
  // }

  async studentProgress(id: string) {
    // 1. Lấy thông tin lớp học phần (Registration)
    const registration = await this.registrationModel.findById(id).lean();
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // 2. Lấy thông tin Course để biết tên môn học (courseName)
    // User lưu điểm theo 'Subject' name chứ không phải 'courseCode'
    const course = await this.courseModel
      .findOne({
        courseCode: registration.courseCode,
      })
      .lean();

    if (!course) {
      // Trường hợp hiếm: có registration nhưng không tìm thấy course gốc
      return { ...registration, course: null, studentProgress: [] };
    }

    // 3. Lấy danh sách chi tiết Users dựa trên mảng email trong registration.students
    const students = await this.userModel
      .find({
        email: { $in: registration.students },
      })
      .lean();

    // 4. Map dữ liệu để lấy điểm số tương ứng với môn học này
    const studentProgress = students.map((student) => {
      // User.subjects là mảng hỗn hợp, cần tìm object chứa điểm của môn học hiện tại
      // Logic: Tìm phần tử có thuộc tính 'Subject' trùng với course.courseName
      const subjectData = student.subjects.find(
        (sub: any) => sub.Subject === course.courseName,
      );

      // (Optional) Nếu cấu trúc User lưu studentId/major trong mảng subjects (như schema bạn đưa ở index 1)
      // Ta cũng cần tìm nó để hiển thị thông tin sinh viên
      const profileData: any =
        student.subjects.find((sub: any) => sub.studentId) || {};

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        studentId: profileData.studentId || (student as any).studentId || 'N/A', // Fallback nhiều chỗ
        // major: profileData.major || (student as any).major || 'N/A',

        // Trả về điểm số (hoặc null nếu sv chưa có điểm môn này)
        scores: subjectData ? subjectData.scores : null,
      };
    });

    // 5. Trả về kết quả tổng hợp
    return {
      studentProgress: studentProgress, // Mảng chứa thông tin sv + điểm
    };
  }
}
