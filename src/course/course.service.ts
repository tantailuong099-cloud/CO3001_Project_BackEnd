import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UserService } from '@/user/user.service';
import { UserRole, User, UserDocument } from '@/user/schema/user.schema';

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private userService: UserService, 

    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Create a new course
  async createCourse(createCourseDto: CreateCourseDto) {
    try {
      const newCourse = new this.courseModel(createCourseDto);
      return await newCourse.save();
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // Get all courses
  async getAllCourses() {
    return this.courseModel.find().populate('tutors').populate('students').exec();
  }

  // Get a course by ID
  async getCourseById(id: string) {
    const course = await this.courseModel
      .findById(id)
      .populate('tutors')
      .populate('students')
      .exec();
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  // Update a course
  async updateCourse(id: string, updateCourseDto: UpdateCourseDto) {
    const updatedCourse = await this.courseModel
      .findByIdAndUpdate(id, updateCourseDto, { new: true })
      .exec();
    if (!updatedCourse) {
      throw new NotFoundException('Course not found');
    }
    return updatedCourse;
  }

  // Delete a course
  async deleteCourse(id: string) {
    const result = await this.courseModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Course not found');
    }
    return { message: 'Course deleted successfully' };
  }

  //Assign Tutor
  async assignTutorToCourse(courseId: string, tutorId: string) {
    // const course = await this.getCourseById(courseId);
    // const tutor = await this.userService.updateUserInfo(tutorId, {
    //   $addToSet: { courses: courseId },
    // });

    // if (tutor.role !== UserRole.TUTOR) {
    //   throw new InternalServerErrorException('User is not a tutor');
    // }

    // course.tutors.push(tutor);
    // return await course.save();

    const course = await this.courseModel.findById(courseId).exec();
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const tutor = await this.userModel.findById(tutorId);
    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }
    if (tutor.role !== UserRole.TUTOR) {
      throw new BadRequestException('User is not a tutor');
    }

    await this.userService.updateUserInfo(tutorId, {
      $addToSet: { courses: courseId as any },
    });

    return this.courseModel
      .findByIdAndUpdate(
        courseId,
        { $addToSet: { tutors: tutorId } }, 
        { new: true },
      )
      .exec();
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

    const student = await this.userModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('User is not a student');
    }

    await this.userService.updateUserInfo(studentId, {
      $addToSet: { class: courseId as any },
    });

    return this.courseModel
      .findByIdAndUpdate(
        courseId,
        { $addToSet: { students: studentId } },
        { new: true },
      )
      .exec();
  }


  //Unassign Tutor
  async unassignTutorFromCourse(courseId: string, tutorId: string) {
    await this.userService.updateUserInfo(tutorId, {
      $pull: { courses: courseId as any },
    });

    return this.courseModel
      .findByIdAndUpdate(
        courseId,
        { $pull: { tutors: tutorId } },
        { new: true },
      )
      .exec();
  }

  //Unregister Student
  async unregisterStudentForCourse(courseId: string, studentId: string) {
    await this.userService.updateUserInfo(studentId, {
      $pull: { class: courseId as any },
    });

    return this.courseModel
      .findByIdAndUpdate(
        courseId,
        { $pull: { students: studentId } },
        { new: true },
      )
      .exec();
  }
}