// src\course\course.service.ts

import {
  Injectable,
  NotFoundException,
  // BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model /*,Types*/ } from 'mongoose';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  Registration,
  RegistrationDocument,
  RegistrationStatus,
} from '@/matching/schema/registration.schema';

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
      : Array.from(
          { length: 5 },
          (_, i) => `CC${(i + 1).toString().padStart(2, '0')}`,
        );

    const course = new this.courseModel({
      ...dto,
      classGroups,
      semester: dto.semester || '2025 Fall',

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
      courseCode: saved.courseCode,
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
    // return this.courseModel
    //   .find()
    //   .populate('tutors')
    //   .populate('students')
    //   .exec();
    return this.courseModel.find().exec();
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
            course: course._id,
            courseCode: course.courseCode,
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
          course: course._id,
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

    return { message: 'Course and class group registrations deleted' };
  }

  // async getCoursesForUser(userId: string, role: UserRole) {
  //   if (role === UserRole.TUTOR) {
  //     console.log(`--- SERVICE: Finding courses for TUTOR ${userId} ---`);
  //     return this.courseModel.find({ tutors: userId }).exec();
  //   }

  //   if (role === UserRole.STUDENT) {
  //     console.log(`--- SERVICE: Finding courses for STUDENT ${userId} ---`);
  //     const registrations = await this.registrationModel
  //       .find({ students: userId })
  //       .select('courseCode')
  //       .exec();

  //     const courseIds = [
  //       ...new Set(registrations.map((reg) => reg.courseCode as string)),
  //     ];

  //     console.log(
  //       `--- SERVICE: Student is registered in course IDs:`,
  //       courseIds,
  //     );

  //     if (courseIds.length === 0) {
  //       return [];
  //     }
  //     return this.courseModel
  //       .find({
  //         _id: { $in: courseIds },
  //       })
  //       .exec();
  //   }

  //   return [];
  // }

  // async getCoursesForUser(userId: string, role: UserRole) {
  //   if (role === UserRole.TUTOR) {
  //     console.log(
  //       `--- SERVICE: Finding courses for TUTOR ID ${userId} by NAME ---`,
  //     );

  //     const tutor = await this.userService.findById(userId);
  //     if (!tutor) {
  //       console.log(`--- SERVICE: Tutor with ID ${userId} not found.`);
  //       return [];
  //     }
  //     const tutorName = tutor.name;
  //     console.log(`--- SERVICE: Tutor name is "${tutorName}".`);

  //     const allCourses = await this.courseModel.find().exec();

  //     const filteredCourses = allCourses.filter((course) => {
  //       // // --- LOG CUỐI CÙNG ĐỂ TÌM RA SỰ THẬT ---
  //       // console.log(`--- FINAL DEBUG for course ${course.courseCode} ---`);
  //       // console.log(`Value of course.tutors:`, course.tutors);
  //       // console.log(`Type of course.tutors: ${typeof course.tutors}`);
  //       // console.log(`Is it an array? ${Array.isArray(course.tutors)}`);

  //       const tutorsField = course.tutors as any;

  //       // Xử lý nếu nó là một MẢNG (kịch bản có khả năng nhất)
  //       if (Array.isArray(tutorsField)) {
  //         // Kiểm tra xem có phần tử nào trong mảng chứa tên tutor không
  //         return tutorsField.some(
  //           (item) => typeof item === 'string' && item.includes(tutorName),
  //         );
  //       }

  //       // Xử lý nếu nó là một CHUỖI (như logic cũ)
  //       if (typeof tutorsField === 'string' && tutorsField.startsWith('[')) {
  //         try {
  //           const tutorNamesArray: string[] = JSON.parse(
  //             tutorsField.replace(/'/g, '"'),
  //           );
  //           return tutorNamesArray.some((name) => name.trim() === tutorName);
  //         } catch (e) {
  //           return false;
  //         }
  //       }

  //       return false;
  //     });

  //     console.log(
  //       `--- SERVICE: Found ${filteredCourses.length} courses for tutor "${tutorName}".`,
  //     );
  //     return filteredCourses;
  //   }

  //   if (role === UserRole.STUDENT) {
  //     console.log(`--- SERVICE: Finding courses for STUDENT ${userId} ---`);
  //     const registrations = await this.registrationModel
  //       .find({ students: userId })
  //       .select('courseCode')
  //       .exec();
  //     const courseCodes = [
  //       ...new Set(registrations.map((reg) => reg.courseCode as string)),
  //     ];
  //     if (courseCodes.length === 0) return [];
  //     return this.courseModel.find({ courseCode: { $in: courseCodes } }).exec();
  //   }

  //   return [];
  // }

  async getCoursesForUser(userId: string, role: UserRole) {
    // BƯỚC 1: LẤY THÔNG TIN USER BẤT KỂ VAI TRÒ
    const user = await this.userService.findById(userId);
    if (!user) {
      console.log(`--- SERVICE: User with ID ${userId} not found.`);
      return [];
    }
    const userName = user.name;
    const userEmail = user.email;
    console.log(
      `--- SERVICE: User name is "${userName}", Email is "${userEmail}", Role is "${role}".`,
    );

    // ======================================================
    // LOGIC CHO TUTOR (SO SÁNH TÊN)
    // ======================================================
    if (role === UserRole.TUTOR) {
      const allCourses = await this.courseModel.find().exec();
      const filteredCourses = allCourses.filter((course) => {
        const tutorsField = course.tutors as any;
        if (Array.isArray(tutorsField)) {
          return tutorsField.some(
            (item) => typeof item === 'string' && item.includes(userName),
          );
        }
        if (typeof tutorsField === 'string' && tutorsField.startsWith('[')) {
          try {
            const tutorNamesArray: string[] = JSON.parse(
              tutorsField.replace(/'/g, '"'),
            );
            return tutorNamesArray.some((name) => name.trim() === userName);
          } catch (e) {
            return false;
          }
        }
        return false;
      });
      console.log(
        `--- SERVICE: Found ${filteredCourses.length} courses for tutor "${userName}".`,
      );
      return filteredCourses;
    }

    // ======================================================
    // LOGIC MỚI CHO STUDENT (SO SÁNH TÊN)
    // ======================================================
    if (role === UserRole.STUDENT) {
      const allRegistrations = await this.registrationModel.find().exec();

      // Lọc bằng tay các registration có chứa EMAIL của student
      const studentRegistrations = allRegistrations.filter((reg) => {
        const studentsField = reg.students as any;
        if (Array.isArray(studentsField)) {
          // 👇 THAY ĐỔI CỐT LÕI NẰM Ở ĐÂY
          // So sánh `userEmail` với các email trong mảng `studentsField`
          return studentsField.some(
            (emailInArray) =>
              typeof emailInArray === 'string' &&
              emailInArray.trim().toLowerCase() ===
                userEmail.trim().toLowerCase(),
          );
        }
        return false;
      });

      if (studentRegistrations.length === 0) {
        console.log(
          `--- SERVICE: No registrations found for student with email "${userEmail}".`,
        );
        return [];
      }

      const courseCodes = [
        ...new Set(studentRegistrations.map((reg) => reg.courseCode as string)),
      ];
      console.log(
        `--- SERVICE: Student with email "${userEmail}" is in course codes:`,
        courseCodes,
      );

      return this.courseModel.find({ courseCode: { $in: courseCodes } }).exec();
    }

    return [];
  }
}
