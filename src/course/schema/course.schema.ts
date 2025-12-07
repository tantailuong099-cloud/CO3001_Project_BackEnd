// src\course\schema\course.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
// import * as mongoose from 'mongoose';
// import { User } from '@/user/schema/user.schema';
// import * as mongoose from 'mongoose';
// import { User } from '@/user/schema/user.schema';

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true })
  courseCode: string;

  @Prop({ required: true })
  courseName: string;

  @Prop({ required: true })
  department: string;

  @Prop()
  description: string;

  @Prop()
  duration: string;

  @Prop({ required: true })
  semester: string; // e.g. "2025 Spring"

  // NEW: list of class group identifiers for this course (e.g. ["A","B","C"])
  @Prop({ type: [String], default: [] })
  classGroups: string[];

  @Prop({ required: true, default: 30 })
  capacity: number;

  // --- Registration period ---
  @Prop({ required: true })
  registrationStart: Date;

  @Prop({ required: true })
  registrationEnd: Date;

  // --- Teaching period ---
  @Prop({ required: true })
  courseStart: Date;

  @Prop({ required: true })
  courseEnd: Date;

  // --- Relationships ---
  // Keep tutors as potential tutors (not assigned to specific classGroup)
  @Prop({ type: [String], default: [] })
  tutors: string[];

  // --- Status ---
  @Prop({
    enum: ['upcoming', 'registration', 'ongoing', 'completed'],
    default: 'upcoming',
  })
  status: string;
}

export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);
