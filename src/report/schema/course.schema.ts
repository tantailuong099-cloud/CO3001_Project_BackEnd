import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'courses' })
export class Course {
  @Prop()
  courseCode: string;

  @Prop()
  courseName: string;

  @Prop()
  department: string;
}

export type CourseDocument = Course & Document;
export const CourseSchema = SchemaFactory.createForClass(Course);