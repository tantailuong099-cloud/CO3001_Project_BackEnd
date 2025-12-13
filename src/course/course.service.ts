// src\course\course.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  Material,
  Registration,
  RegistrationDocument,
} from '@/matching/schema/registration.schema';

/* -----------------------------------------
   Normalize array input BEFORE using it
----------------------------------------- */
function normalizeArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim());

  if (typeof value === 'string') {
    try {
      const arr = JSON.parse(value.replace(/'/g, '"'));
      if (Array.isArray(arr)) return arr.map((v) => String(v).trim());
    } catch {}
    return [value.trim()];
  }

  return [String(value).trim()];
}

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,

    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,
  ) {}

  private computeStatus(course: any): string {
    const now = new Date();
    const regStart = new Date(course.registrationStart);
    const regEnd = new Date(course.registrationEnd);
    const start = new Date(course.courseStart);
    const end = new Date(course.courseEnd);

    if (now < regStart) return 'upcoming';
    if (now >= regStart && now <= regEnd) return 'registration';
    if (now > regEnd && now < end) return 'ongoing';
    return 'completed';
  }

  /** Create course with auto classGroups and defaults */
  async createCourse(dto: CreateCourseDto) {
    const now = new Date();

    // normalize first
    const classGroups = normalizeArray(dto.classGroups);
    const finalGroups =
      classGroups.length > 0
        ? classGroups
        : Array.from(
            { length: 5 },
            (_, i) => `CC${String(i + 1).padStart(2, '0')}`,
          );

    const coursePayload = new this.courseModel({
      ...dto,
      classGroups: finalGroups,
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
        : new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
    });

    // validate date coherence
    if (coursePayload.registrationStart >= coursePayload.registrationEnd) {
      throw new BadRequestException(
        'registrationStart must be before registrationEnd',
      );
    }
    if (coursePayload.courseStart >= coursePayload.courseEnd) {
      throw new BadRequestException('courseStart must be before courseEnd');
    }

    const course = new this.courseModel(coursePayload);
    const saved = await course.save();

    // normalize tutors array
    const tutors = normalizeArray(dto.tutors);

    // Create empty registration docs for each class group
    const regDocs = finalGroups.map((group, index) => ({
      course: saved._id,
      courseCode: saved.courseCode,
      classGroup: group,
      tutor: tutors.length > 0 ? tutors[index % tutors.length] : null,
      students: [],
      sessions: [],
      registeredCount: 0,
      materials: Material,
    }));

    await this.registrationModel.insertMany(regDocs);
    return saved;
  }

  /** Get all courses */
  async getAllCourses() {
    const courses = await this.courseModel.find().lean();
    return courses.map((c) => ({
      ...c,
      status: this.computeStatus(c),
    }));
  }

  /** Get course by courseCode */
  async getCoursesByCode(courseCode: string) {
    const courses = await this.courseModel.find({ courseCode }).lean();
    return courses.map((c) => ({
      ...c,
      status: this.computeStatus(c),
    }));
  }

  /** Get course by ID */
  async getCourseById(id: string) {
    const course = await this.courseModel.findById(id).lean();
    if (!course) throw new NotFoundException('Course not found');

    return {
      ...course,
      status: this.computeStatus(course),
    };
  }

  /* ---------------------------------------------------------------------
      UPDATE COURSE (AND UPDATE CLASSGROUP REGISTRATIONS)
     --------------------------------------------------------------------- */
  async updateCourse(id: string, dto: UpdateCourseDto) {
    const course = await this.courseModel.findById(id);
    if (!course) throw new NotFoundException('Course not found');

    // normalize BEFORE comparing
    const normalizedGroups = dto.classGroups
      ? normalizeArray(dto.classGroups)
      : null;

    if (normalizedGroups) {
      const oldGroups = course.classGroups;
      const newGroups = normalizedGroups;

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

      // override clean groups to DTO
      dto.classGroups = newGroups;
    }

    const updated = await this.courseModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    return {
      ...updated,
      status: this.computeStatus(updated),
    };
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

  async countCourse() {
    const totalCourse = await this.courseModel.countDocuments({});
    return { course: totalCourse };
  }
}
