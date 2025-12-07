// src\matching\matching.service.ts

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration, RegistrationDocument, RegistrationStatus } from './schema/registration.schema';
import { RegisterProgramDto } from './dto/register-program.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { User, UserRole, UserDocument } from '@/user/schema/user.schema';
import { Course, CourseDocument } from '@/course/schema/course.schema';
import { UpdateRegistrationDto } from './dto/update-registration.dto';

type Session  = { day: string; startTime: string; endTime: string };
type TimeSlot = { day: string; start:     number; end:     number };

@Injectable()
export class MatchingService {
  constructor(
    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,

    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}


  /* -------------------
     Helper utilities
     ------------------- */

  private parseHHMM(hhmm: string): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (Number.isNaN(h) || Number.isNaN(mm) || h < 0 || h > 23 || mm < 0 || mm > 59)
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
      throw new BadRequestException('Invalid session time format. Use "HH:MM".');
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
    if (!Array.isArray(course.classGroups) || !course.classGroups.includes(dto.classGroup)) {
      throw new BadRequestException('Invalid class group for this course');
    }

    // Ensure registration period is active
    const now = new Date();
    if (now < new Date(course.registrationStart) || now > new Date(course.registrationEnd)) {
      throw new BadRequestException('Registration period is not active for this course');
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
    let registration = await this.registrationModel.findOne({
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
        if (existing) throw new BadRequestException('Student already registered for this class group');

        // otherwise capacity likely full
        throw new BadRequestException('Class is already full');
      }

      return { message: 'Student successfully registered', registration: updated };
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
    return { message: 'Student successfully registered (created registration)', registration: created };
  }

  /**
   * Unregister student from class group.
   * Rules:
   *  - course must exist
   *  - unregister only allowed during registration period
   *  - student must currently be registered in that registration doc
   *  - operation is atomic
   */
  async unregisterStudent(studentId: string, courseId: string, classGroup: string) {
    const course = await this.courseModel.findById(courseId).lean();
    if (!course) throw new NotFoundException('Course not found');

    const now = new Date();
    if (now < new Date(course.registrationStart) || now > new Date(course.registrationEnd)) {
      throw new BadRequestException('You can only unregister during the registration period');
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
      const reg = await this.registrationModel.findOne({ course: courseId, classGroup });
      if (!reg) throw new NotFoundException('Registration not found');
      if (!reg.students.includes(studentId)) throw new BadRequestException('Student not registered in this class group');
      // fallback
      throw new BadRequestException('Unable to unregister student');
    }

    // If after removal there are 0 students, optionally set status back to CREATED or TUTOR_ASSIGNED
    if ((updated.registeredCount || 0) <= 0) {
      // keep tutor assignment, but set status to TUTOR_ASSIGNED or CREATED depending on whether tutor exists
      updated.status = updated.tutor ? RegistrationStatus.TUTOR_ASSIGNED : RegistrationStatus.CREATED;
      await updated.save();
    }

    return { message: 'Student successfully unregistered', registration: updated };
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

    if (!registration) throw new NotFoundException('You are not assigned to this class group');

    // Validate sessions structure & intra-session rules
    this.validateSessionsOrThrow(dto.sessions);

    // Check tutor conflicts: find other registrations where tutor is assigned and sessions overlap
    const otherRegs = await this.registrationModel.find({
      tutor: tutorId,
      _id: { $ne: registration._id },
      sessions: { $exists: true },
    }).lean();

    for (const other of otherRegs) {
      if (other.sessions && this.sessionsOverlap(other.sessions as Session[], dto.sessions)) {
        throw new BadRequestException(
          `Schedule conflicts with tutor's other class group (${other.courseCode} / ${other.classGroup})`,
        );
      }
    }

    // Save sessions
    registration.sessions = dto.sessions;
    // If tutor is assigned and sessions exist, set TUTOR_ASSIGNED or ACTIVE remains as is
    registration.status = registration.status === RegistrationStatus.ACTIVE
      ? RegistrationStatus.ACTIVE
      : RegistrationStatus.TUTOR_ASSIGNED;
    await registration.save();

    return { message: 'Schedule successfully set', schedule: registration.sessions };
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
    if (!Array.isArray(course.classGroups) || !course.classGroups.includes(classGroup)) {
      throw new BadRequestException('Invalid class group for this course');
    }

    // Tutor validation
    const tutor = await this.userModel.findById(tutorId).lean();
    if (!tutor || tutor.role !== UserRole.TUTOR) throw new BadRequestException('Invalid tutor');

    // Load or create registration
    let registration = await this.registrationModel.findOne({ course: courseId, classGroup });
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
      return { message: 'Tutor assigned and registration created', registration };
    }

    // If registration has sessions, ensure assigning tutor doesn't conflict with tutor's other schedules
    if (Array.isArray(registration.sessions) && registration.sessions.length > 0) {
      // find other regs for this tutor and check overlap
      const otherRegs = await this.registrationModel.find({ tutor: tutorId, _id: { $ne: registration._id } }).lean();
      for (const other of otherRegs) {
        if (other.sessions && this.sessionsOverlap(other.sessions as Session[], registration.sessions as Session[])) {
          throw new BadRequestException('Tutor schedule conflict with another assigned class group');
        }
      }
    }

    registration.tutor = tutorId;
    registration.status = registration.registeredCount && registration.registeredCount > 0
      ? RegistrationStatus.ACTIVE
      : RegistrationStatus.TUTOR_ASSIGNED;
    await registration.save();

    return { message: 'Tutor assigned', registration };
  }
  
  /**
   * Unassign tutor from a class group (admin)
   */
  async unassignTutor(courseId: string, classGroup: string) {
    const registration = await this.registrationModel.findOne({ course: courseId, classGroup });
    if (!registration) throw new NotFoundException('Class group registration not found');

    registration.tutor = null;
    registration.sessions = [];
    registration.status = registration.registeredCount && registration.registeredCount > 0
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
  
  async deleteRegistrationByCourseGroup(courseCode: string, classGroup: string) {
    const reg = await this.registrationModel.findOne({ courseCode, classGroup });
    if (!reg) throw new NotFoundException('Registration not found');

    // Optionally: delete course info if needed
    await reg.deleteOne();
    return { message: 'Deleted successfully' };
  }
}