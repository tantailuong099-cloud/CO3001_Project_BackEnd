// src\course\course.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Registration, RegistrationDocument, RegistrationStatus } from '@/matching/schema/registration.schema';

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) 
    private readonly courseModel: Model<CourseDocument>,

    @InjectModel(Registration.name) 
    private readonly registrationModel: Model<RegistrationDocument>,
  ) {}

  /** Create course with auto classGroups and defaults */
  async createCourse(dto: CreateCourseDto) {
    const now = new Date();

    // auto-generate class groups if not provided
    const classGroups = dto.classGroups?.length
      ? dto.classGroups
      : Array.from({ length: 5 }, (_, i) => `CC${(i + 1).toString().padStart(2, '0')}`);

    const course = new this.courseModel({
      ...dto,
      classGroups,
      semester: dto.semester || 'Fall 2025',

      registrationStart: dto.registrationStart
        ? new Date(dto.registrationStart)
        : now,

      registrationEnd: dto.registrationEnd
        ? new Date(dto.registrationEnd)
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),

      courseStart: dto.courseStart
        ? new Date(dto.courseStart)
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),

      courseEnd: dto.courseEnd
        ? new Date(dto.courseEnd)
        : new Date(now.getTime() + 28 * 7 * 24 * 60 * 60 * 1000),
    });

    const saved = await course.save();

    // Create empty registration docs for each class group
    const regDocs = classGroups.map((group) => ({
      course: saved._id,
      classGroup: group,
      students: [],
      tutor: null,
      sessions: [],
      registeredCount: 0,
      status: RegistrationStatus.CREATED, // no tutor, no students yet
    }));

    await this.registrationModel.insertMany(regDocs);

    return saved;
  }

  /** Get all courses */
  async getAllCourses() {
    return this.courseModel.find().lean();
  }

  /** Get course by ID */
  async getCourseById(id: string) {
    const course = await this.courseModel.findById(id);
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  /* ---------------------------------------------------------------------
      UPDATE COURSE (AND UPDATE CLASSGROUP REGISTRATIONS)
     --------------------------------------------------------------------- */
  async updateCourse(id: string, dto: UpdateCourseDto) {
    const course = await this.courseModel.findById(id);
    if (!course) throw new NotFoundException('Course not found');

    // ---------------------------
    // CLASS GROUP SYNC HANDLING
    // ---------------------------
    if (dto.classGroups) {
      const oldGroups = course.classGroups;
      const newGroups = dto.classGroups;

      const addedGroups = newGroups.filter((g) => !oldGroups.includes(g));
      const removedGroups = oldGroups.filter((g) => !newGroups.includes(g));

      // create registration docs for added groups
      if (addedGroups.length > 0) {
        await this.registrationModel.insertMany(
          addedGroups.map((g) => ({
            course: id,
            classGroup: g,
            students: [],
            tutor: null,
            sessions: [],
            registeredCount: 0,
            status: RegistrationStatus.CREATED,
          }))
        );
      }

      // remove registration docs for deleted groups
      if (removedGroups.length > 0) {
        await this.registrationModel.deleteMany({
          course: id,
          classGroup: { $in: removedGroups },
        });
      }
    }

    // update the course
    const updated = await this.courseModel.findByIdAndUpdate(id, dto, { new: true });
    return updated;
  }

  /* ---------------------------------------------------------------------
      DELETE COURSE (AND ALL CLASSGROUP REGISTRATIONS)
     --------------------------------------------------------------------- */
  async deleteCourse(id: string) {
    const res = await this.courseModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Course not found');

    await this.registrationModel.deleteMany({ course: id });

    return { message: 'Course and class group registrations deleted' };
  }
}

//
//   /** Assign tutor to specific class group with sessions */
//   async assignTutorToCourse(courseId: string, classGroup: string, tutorId: string, sessions: any[]) {
//     const course = await this.courseModel.findById(courseId).exec();
//     if (!course) throw new NotFoundException('Course not found');

//     if (!course.classGroups.includes(classGroup)) 
//       throw new BadRequestException('Invalid class group');

//     const tutor = await this.userModel.findById(tutorId).exec();
//     if (!tutor || tutor.role !== UserRole.TUTOR)
//       throw new BadRequestException('Invalid tutor');

//     // Find or create Registration document
//     let registration = await this.registrationModel.findOne({ course: courseId, classGroup });
//     if (!registration) {
//       registration = new this.registrationModel({
//         course: courseId,
//         classGroup,
//         students: [],
//         tutor: tutorId,
//         status: RegistrationStatus.ASSIGNED,
//       });
//     } else {
//       registration.tutor = tutorId;
//     }

//     registration.sessions = sessions;
//     return registration.save();
//   }

//   /** Unassign tutor from class group */
//   async unassignTutorFromCourse(courseId: string, classGroup: string) {
//     const registration = await this.registrationModel.findOne({ course: courseId, classGroup });
//     if (!registration) throw new NotFoundException('Registration not found for this class group');

//     registration.tutor = null;
//     registration.sessions = [];
//     return registration.save();
//   }

//   /** Register student to a specific class group */
//   async registerStudentForCourse(courseId: string, classGroup: string, studentId: string) {
//     const course = await this.courseModel.findById(courseId).exec();
//     if (!course) throw new NotFoundException('Course not found');
//     if (!course.classGroups.includes(classGroup)) throw new BadRequestException('Invalid class group');

//     const student = await this.userModel.findById(studentId).exec();
//     if (!student || student.role !== UserRole.STUDENT) throw new BadRequestException('Invalid student');

//     const registration = await this.registrationModel.findOne({ course: courseId, classGroup });
//     if (!registration) throw new NotFoundException('Registration not found for this class group');

//     if (registration.students.includes(studentId)) 
//       throw new BadRequestException('Student already registered');

//     // Check capacity
//     if (registration.students.length >= course.capacity) throw new BadRequestException('Class is full');

//     registration.students.push(studentId);
//     await registration.save();

//     // Increment course registeredCount
//     await this.courseModel.updateOne({ _id: courseId }, { $inc: { registeredCount: 1 } });

//     return registration;
//   }

//   /** Unregister student from class group */
//   async unregisterStudentForCourse(courseId: string, classGroup: string, studentId: string) {
//     const registration = await this.registrationModel.findOne({ course: courseId, classGroup });
//     if (!registration) throw new NotFoundException('Registration not found for this class group');

//     registration.students = registration.students.filter((s) => s !== studentId);
//     return registration.save();
//   }
// }