import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import { HydratedDocument } from 'mongoose';

interface Subjects {
  Subject: string;
  score: number;
}

@Schema()
export class Student extends User {
  @Prop()
  subjects: Subjects[];
  @Prop()
  class: string[];
}

export type StudentDocument = HydratedDocument<Student>;
export const StudentSchema = SchemaFactory.createForClass(Student);
