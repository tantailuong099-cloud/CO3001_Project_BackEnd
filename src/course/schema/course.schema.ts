// src\course\schema\course.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose'; 
import { User } from '@/user/schema/user.schema'; 

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

  @Prop({ required: true })
  classGroup: string; // e.g. "A" or "B" — one tutor per class group

  @Prop({ type: [String], default: [] })
  schedule: string[];

  @Prop({ required: true, default: 30 })
  capacity: number;

  // --- Registration period ---
  @Prop({ default: 0 })
  registeredCount: number;

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
  @Prop({ type: [String], default: [] })
  tutors: string[];

  @Prop({ type: [String], default: [] })
  students: string[];

  // --- Status ---
  @Prop({
    enum: ['upcoming', 'registration', 'ongoing', 'completed'], default: 'upcoming',
  })
  status: string;
}



export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);