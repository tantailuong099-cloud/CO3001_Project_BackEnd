// src\course\course.service.ts

import {
  Injectable,
  // InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  Registration,
  RegistrationDocument,
  RegistrationStatus,
} from '@/matching/schema/registration.schema';
import { UserRole } from '@/user/schema/user.schema';
import { UserService } from '@/user/user.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private userService: UserService,

    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,
  ) {}

  /** Create course with auto classGroups and defaults */
  async createCourse(dto: CreateCourseDto) {
    const now = new Date();

    // auto-generate class groups if not provided
    const classGroups = dto.classGroups?.length
      ? dto.classGroups
      : Array.from(
          { length: 5 },
          (_, i) => `CC${(i + 1).toString().padStart(2, '0')}`,
        );

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
    return this.courseModel
      .find()
      .populate('tutors')
      .populate('students')
      .exec();
  }

  /** Get course by courseCode */
  async getCoursesByCode(courseCode: string) {
    return this.courseModel.find({ courseCode }).lean();
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
          })),
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
    const updated = await this.courseModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    return updated;
  }

  /* ---------------------------------------------------------------------
      DELETE COURSE (AND ALL CLASSGROUP REGISTRATIONS)
     --------------------------------------------------------------------- */
  async deleteCourse(id: string) {
    const res = await this.courseModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Course not found');

    await this.registrationModel.deleteMany({ course: id });

    // if (tutor.role !== UserRole.TUTOR) {
    //   throw new InternalServerErrorException('User is not a tutor');
    // }

    // course.tutors.push(tutor);
    // return await course.save();

    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const tutor = await this.userService.findById(course.tutors[0]);
    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }
    if (tutor.role !== UserRole.TUTOR) {
      throw new BadRequestException('User is not a tutor');
    }

    course.tutors.push(tutor._id.toString());
    return await course.save();
  }

  //Register
  async registerStudentForCourse(courseId: string, studentId: string) {
    //   const course = await this.getCourseById(courseId);
    //   const student = await this.userService.updateUserInfo(studentId, {
    //     $addToSet: { class: courseId },
    //   });

    //   if (student.role !== UserRole.STUDENT) {
    //     throw new InternalServerErrorException('User is not a student');
    //   }

    //   course.students.push(student);
    //   return await course.save();

    const course = await this.courseModel.findById(courseId).exec();
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const student = await this.userService.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('User is not a student');
    }

    //course.students.push(student._id.toString());
    return await course.save();
  }
}
