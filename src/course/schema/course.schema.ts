import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from '@/user/schema/user.schema';

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true })
  courseName: string;

  @Prop()
  subject: string;

  @Prop()
  duration: string;

  @Prop({type: [String], default: []})
  schedule: string[];

  @Prop()
  description: string;

  @Prop({required: true, default: 60})
  capacity: number;
  
  @Prop({ type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}] })
  tutors: User[];

  @Prop({ type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}] })
  students: User[];
}

export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);
