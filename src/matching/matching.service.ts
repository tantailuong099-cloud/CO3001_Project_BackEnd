// src\matching\matching.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Registration, RegistrationDocument, RegistrationStatus } from './schema/registration.schema';
import { RegisterProgramDto } from './dto/register-program.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { User, UserRole, UserDocument } from '@/user/schema/user.schema';
import { Course, CourseDocument } from '@/course/schema/course.schema';
import { Tutor, TutorDocument } from '@/user/schema/tutor.schema'; 


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

  /**
   * STUDENT registers for a course/classGroup.
   * If the class group already has a registration doc, append the student.
   * If not, create one.
   */

  async registerStudent(studentId: string, dto: RegisterProgramDto) {
    const course = await this.courseModel.findById(dto.course).lean();
    if (!course) throw new NotFoundException('Course not found');

    // Ensure registration period is active
    const now = new Date();
    if (now < new Date(course.registrationStart) || now > new Date(course.registrationEnd)) {
      throw new BadRequestException('Registration period is not active for this course');
    }
    
    // Validate student exists and is actually a student
    const student = await this.userModel.findById(studentId).lean();
    if (!student) throw new NotFoundException('Student user not found');
    if ((student as any).role && (student as any).role !== UserRole.STUDENT) {
      throw new BadRequestException('Only students can register for courses');
    }

    // Find existing registration record for this course/classGroup
    let registration = await this.registrationModel.findOne({
      course: course._id.toString(),
      classGroup: course.classGroup,
    });

    if (!registration) {
      // Create new registration record for this class group
      registration = new this.registrationModel({
        course: course._id.toString(),
        classGroup: course.classGroup,
        tutor: course.tutors?.[0] || null,
        students: [studentId],
        status: RegistrationStatus.ASSIGNED,
      });
    } else {
      // Avoid duplicate registration
      if (registration.students.includes(studentId)) {
        throw new BadRequestException('Student already registered for this course');
      }

      // Check capacity
      if (registration.students.length >= course.capacity) {
        throw new BadRequestException('Class is already full');
      }

      registration.students.push(studentId);
    }

    // Save registration
    await registration.save();

    // Increment registeredCount in course
    await this.courseModel.updateOne(
      { _id: course._id },
      { $inc: { registeredCount: 1 } },
    );

    return { message: 'Student successfully registered', registration };
  }

  /**
   *  TUTOR sets schedule for their assigned course/classGroup.
   */
  async setSchedule(tutorId: string, dto: SetScheduleDto) {
    const course = await this.courseModel.findById(dto.courseId);
    if (!course) throw new NotFoundException('Course not found');

    // Check tutor is assigned
    //    * If course.tutors is missing or not an array, it immediately fails.
    //    * If it is an array, it converts all tutor IDs to strings 
    // (important if they’re stored as ObjectIds) and checks membership safely.
    if (!Array.isArray(course.tutors) || !course.tutors.map(String).includes(String(tutorId))) {
      throw new BadRequestException('You are not assigned to this course');
    }

    // Validate sessions: non-empty array
    if (!Array.isArray(dto.sessions) || dto.sessions.length === 0) {
      throw new BadRequestException('No sessions provided');
    }

    // Convert sessions to readable string format
    const scheduleStrings = dto.sessions.map(
      (s) => `${s.day} ${s.startTime}-${s.endTime}`,
    );

    course.schedule = scheduleStrings;
    await course.save();

    return { message: 'Schedule successfully set', schedule: course.schedule };
  }

  /**
   * Get all registrations (for admin or tutor)
   */
  async getAllRegistrations() {
    return this.registrationModel.find().lean();
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
    return this.courseModel.find({ tutors: tutorId }).lean();
  }
}



// type TimeSlot = { day: string; start: number; end: number }; // start, end as minutes from 00:00

// @Injectable()
// export class MatchingService {
//   constructor(
//     @InjectModel(Registration.name)
//     private readonly registrationModel: Model<RegistrationDocument>,

//     @InjectModel(User.name)
//     private readonly userModel: Model<UserDocument>,

//     @InjectModel(Course.name)
//     private readonly courseModel: Model<CourseDocument>,
//   ) {}

//   /**
//    * Register a student for a program. If tutorId provided, attach it.
//    * If no tutor provided, attempt auto assignment.
//    */
//   async registerStudent(createDto: RegisterProgramDto, studentId: string) {
//     const { course: courseId, tutor: tutorId, preferredTimeSlots } = createDto;

//     // Validate course
//     const course = await this.courseModel.findById(courseId).exec();
//     if (!course) throw new NotFoundException('Course/program not found');

//     // Validate student
//     const student = await this.userModel.findById(studentId).exec();
//     if (!student) throw new NotFoundException('Student not found');

//     if (student.role !== UserRole.STUDENT) {
//       throw new BadRequestException('Only students can register for a course.');
//     }

//     // Check capacity (using the field from your course.schema.ts)
//     const currentCount = await this.registrationModel.countDocuments({
//       course: courseId,
//       status: RegistrationStatus.ASSIGNED, // Use enum
//     });

//     if (currentCount >= course.capacity) {
//       throw new BadRequestException('This program is full.');
//     }

//     // If student already registered for same course, we can decide what to do.
//     const existing = await this.registrationModel.findOne({ course: courseId, student: studentId }).exec();
//     if (existing) {
//       throw new BadRequestException('Student already registered for this course');
//     }

//     // If tutor explicitly chosen, validate tutor
//     if (tutorId) {
//       const tutor = await this.userModel.findById(tutorId).exec();
//       if (!tutor) throw new NotFoundException('Tutor not found');

//       // Optionally check tutor role
//       if (tutor.role !== UserRole.TUTOR) {
//         throw new BadRequestException('Selected user is not a tutor');
//       }

//       // Create registration with specified tutor
//       const reg = new this.registrationModel({
//         student: studentId,
//         tutor: tutorId,
//         course: courseId,
//         status: RegistrationStatus.ASSIGNED,
//       });

//       await reg.save();

//       return {
//         assigned: true,
//         registration: reg,
//         message: 'Registered and assigned to selected tutor',
//       };
//     }

//     // No tutor chosen -> create pending registration and try auto-assign
//     const pendingReg = new this.registrationModel({
//       student: studentId,
//       course: courseId,
//       status: RegistrationStatus.PENDING,
//     });
//     await pendingReg.save();

//     // Attempt auto-assignment
//     const assigned = await this.autoAssignTutor(
//       course,
//       student,
//       pendingReg._id,
//       preferredTimeSlots,
//     );

//     return {
//       assigned: assigned.assigned,
//       registration: assigned.registration,
//       message: assigned.message,
//     };
//   }
  
//   /**
//    * Tutor updates constraints
//    */
//   async setConstraints(tutorId: string, dto: SetScheduleDto) {
//     const { preferredSubjects, constraints, preferredStudentLevel } = dto;

//     // Build an update object based on the fields provided in the DTO
//     // This correctly maps to your new tutor.schema.ts
//     const updateData: any = {};
//     if (preferredSubjects) updateData.preferredSubjects = preferredSubjects;
//     if (constraints) updateData.constraints = constraints;
//     if (preferredStudentLevel) updateData.preferredStudentLevel = preferredStudentLevel;

//     const updatedTutor = await this.userModel.findOneAndUpdate(
//       { _id: tutorId, role: UserRole.TUTOR }, // Ensure we only update tutors
//       { $set: updateData },
//       { new: true, runValidators: true },
//     ).exec();

//     if (!updatedTutor) {
//       throw new NotFoundException('Tutor not found');
//     }

//     return { success: true, message: 'Constraints updated successfully', tutor: updatedTutor };
//   }


//   /* ----------------------
//    Helper types & methods
//    ---------------------- */

//   /**
//    * normalizeSlotString
//    * Accepts strings like "Monday|09:00-11:00" or "2025-11-03|14:00-16:00".
//    * Returns a TimeSlot or null on parse error.
//    */

//   private normalizeSlotString(slot: string): TimeSlot | null {
//     if (!slot || typeof slot !== 'string') return null;
//     const parts = slot.split('|');
//     if (parts.length !== 2) return null;
//     const day = parts[0].trim();
//     const timeRange = parts[1].trim();
//     const [startStr, endStr] = timeRange.split('-').map((s) => s.trim());
//     if (!startStr || !endStr) return null;
//     const start = this.parseHHMM(startStr);
//     const end = this.parseHHMM(endStr);
//     if (start === null || end === null || start >= end) return null; // Add check for start >= end
//     return { day, start, end };
//   }


// /**
//  * parseHHMM: "09:30" -> 570 (minutes since midnight). returns number or null.
//  * Keep it simple and timezone-agnostic since we store local times as strings.
//  */
//   private parseHHMM(hhmm: string): number | null {
//     const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
//     if (!m) return null;
//     const h = Number(m[1]);
//     const mm = Number(m[2]);
//     if (isNaN(h) || isNaN(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return null;
//     return h * 60 + mm;
//   }

// /**
//  * checkSlotOverlap
//  * Checks if a desired slot overlaps with at least one tutor slot.
//  * desired: TimeSlot (single desired)
//  * tutorSlots: TimeSlot[] - tutor availability entries
//  *
//  * Overlap rules:
//  * - A tutor slot must have the same `day` string (simple equality).
//  * - Optionally allow date-specific slots like "2025-11-03" to match exact date.
//  */
//   private checkSlotOverlap(desired: TimeSlot, tutorSlots: TimeSlot[]): boolean {
//     // For each tutor slot on the same day, check time overlap
//     for (const t of tutorSlots) {
//         if (String(t.day).toLowerCase() !== String(desired.day).toLowerCase()) continue;
//         // overlap if startA < endB && startB < endA
//         if (desired.start < t.end && t.start < desired.end) return true;
//     }
//     return false;
//   }
  
//   /**
//    * UPGRADED auto-assign algorithm
//    */
//   private async autoAssignTutor(
//     course: CourseDocument,
//     student: UserDocument,
//     registrationId: any,
//     preferredTimeSlots?: string[],
//   ) {
//     // 1. Find all tutors
//     const allTutors = await this.userModel.find({ role: UserRole.TUTOR }).exec();

//     if (!allTutors || allTutors.length === 0) {
//       return {
//         assigned: false,
//         registration: await this.registrationModel.findById(registrationId).exec(),
//         message: 'No tutors available',
//       };
//     }

//     // Normalize preferred time slots (if any)
//     const desiredSlots = (preferredTimeSlots || []).map(s => this.normalizeSlotString(s)).filter(Boolean) as TimeSlot[];
  
//     // 2) Filter tutors -> subject + optional level
//     const subjectFiltered = allTutors.filter((t: any) => {
//       // Tutor's preferredSubjects may be either under tutor.preferredSubjects or tutor.subjects/expertise
//       const tutorSubjects: string[] =
//         (Array.isArray(t.preferredSubjects) && t.preferredSubjects) ||
//         (Array.isArray((t as any).subjects) && (t as any).subjects) ||
//         (t.expertise ? [t.expertise] : []);
//       const teachesSubject = tutorSubjects.length ? tutorSubjects.map(String).includes(String(course.subject)) : true;

//       if (!teachesSubject) return false;

//         // If tutor has preferred student level set, enforce it (if student.level exists)
//       if (t.preferredStudentLevel && (student as any).level) {
//         if (t.preferredStudentLevel !== (student as any).level) return false;
//       }

//       return true;
//     });

//     if (subjectFiltered.length === 0) {
//         return {
//         assigned: false,
//         registration: await this.registrationModel.findById(registrationId).exec(),
//         message: 'No tutors with matching subject found',
//         };
//     }

//     // 3) If desiredSlots provided, filter tutors by availability overlap
//     const availabilityFiltered = desiredSlots.length ? subjectFiltered.filter((t: any) => {
      
//         // if tutor has no constraints, treat them as available (or decide otherwise)
//       if (!Array.isArray(t.constraints) || t.constraints.length === 0) {
//         return true; // permissive: allow tutors with no explicit constraints
//       }
      
//       // convert tutor constraints to TimeSlot[]
//       const tutorSlots: TimeSlot[] = (t.constraints || []).map((c: any) => {
//         const start = this.parseHHMM(c.startTime);
//         const end = this.parseHHMM(c.endTime);
//         if (start === null || end === null) return null;
//         return { day: String(c.day), start, end };
//       }).filter(Boolean) as TimeSlot[];
      
//       // Check if any desiredSlot overlaps with any tutorSlot
//       // At least one preferred slot overlaps with tutor’s available time
//       return desiredSlots.some(desired => this.checkSlotOverlap(desired, tutorSlots));
//     })
//     : subjectFiltered;

//     // 4) Score candidates: prefer tutors with fewest assigned students and best subject match
//     // Build a list of { tutor, load, score } maybe parallelize with Promise.all
//     const scoredCandidates = await Promise.all(
//       availabilityFiltered.map(async (t: any) => {
//         const assignedCount = await this.registrationModel
//           .countDocuments({ tutor: t._id, status: RegistrationStatus.ASSIGNED }).exec();

//         // Score: lower load is better; add small bonus for exact subject match
//         let score = assignedCount; // lower is better
//         const tutorSubjects = (Array.isArray(t.preferredSubjects) ? t.preferredSubjects : []).map(String);
//         if (tutorSubjects.includes(String(course.subject))) score -= 0.5; // prefer exact subject match

//         return { tutor: t, assignedCount, score };
//       }),
//     );

//     // Sort ascending by score (lowest score is best)
//     scoredCandidates.sort((a, b) => a.score - b.score);

//     // 5) Iterate candidates and assign first tutor that has capacity
//     for (const cand of scoredCandidates) {
//       const tutor = cand.tutor as any;
//       const maxStudents = typeof tutor.maxStudents === 'number' ? tutor.maxStudents : 10; // default

//       // count current load for this tutor in this course or overall (choose policy)
//       const currentCount = await this.registrationModel
//         .countDocuments({ tutor: tutor._id, status: RegistrationStatus.ASSIGNED }).exec();

//       if (currentCount >= maxStudents) {
//         continue; // tutor full
//       }

//     // Optionally, re-check time slot availability atomically here if necessary

//     // Assign the registration to this tutor
//     const reg = await this.registrationModel
//         .findByIdAndUpdate(
//           registrationId,
//           { tutor: tutor._id, status: RegistrationStatus.ASSIGNED },
//           { new: true },
//         )
//         .exec();


//       return {
//         assigned: true,
//         registration: reg,
//         message: `Successfully assigned to tutor ${tutor.name}`,
//       };
//     }

//     // Nothing matched capacity or constraints
//     return {
//       assigned: false,
//       registration: await this.registrationModel.findById(registrationId).exec(),
//       message: 'No suitable tutor found. Your request is pending.',
//     };
//   }

//   /**
//    * For tutors: get registrations (students assigned to them)
//    */
//   async getAssignmentsForTutor(tutorId: string) {
//     // simple validation
//     const tutor = await this.userModel.findById(tutorId).exec();
//     if (!tutor) throw new NotFoundException('Tutor not found');

//     const regs = await this.registrationModel
//       .find({ tutor: tutorId })
//       .populate('student', 'name email') // adjust fields to what's in your User schema
//       .populate('course', 'courseName subject') // adjust course fields
//       .exec();

//     return regs;
//   }

//   /**
//    * Optionally: get registrations for a student
//    */
//   async getRegistrationsForStudent(studentId: string) {
//     return this.registrationModel
//       .find({ student: studentId })
//       .populate('tutor', 'name email')
//       .populate('course', 'courseName subject')
//       .exec();
//   }
// }
