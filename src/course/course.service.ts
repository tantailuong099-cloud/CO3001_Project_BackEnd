// src\course\course.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UserService } from '@/user/user.service';
import { UserRole } from '@/user/schema/user.schema';

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private userService: UserService, 
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
    const course = await this.getCourseById(courseId);
    const tutor = await this.userService.updateUserInfo(tutorId, {
      $addToSet: { courses: courseId },
    });

    if (tutor.role !== UserRole.TUTOR) {
      throw new InternalServerErrorException('User is not a tutor');
    }

    course.tutors.push(tutor._id.toString());
    return await course.save();
  }

  //Register
  async registerStudentForCourse(courseId: string, studentId: string) {
    const course = await this.getCourseById(courseId);
    const student = await this.userService.updateUserInfo(studentId, {
      $addToSet: { class: courseId }, 
    });

    if (student.role !== UserRole.STUDENT) {
      throw new InternalServerErrorException('User is not a student');
    }

    course.students.push(student._id.toString());
    return await course.save();
  }
}