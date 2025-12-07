// CO3001_Project_BackEnd_main\src\user\schema\student.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import { HydratedDocument } from 'mongoose';

// Each subject now has a breakdown of scores
interface SubjectScore {
  Subject: string;
  scores: {
    midterm?: number;
    final?: number;
    project?: number;
    participation?: number;
    [key: string]: number | undefined; // allows extra components
  };
  finalScore?: number; // computed as weighted sum of scores
}

@Schema()
export class Student extends User {
  // List of courseCodes (e.g., ["CO2101", "CO2301"])
  @Prop({ type: [String], default: [] })
  enrolledCourses: string[];

  // List of registration document IDs the student belongs to
  @Prop({ type: [String], default: [] })
  registrations: string[];

  // List of subjects and their score breakdowns + final score
  @Prop({
    type: [{ Subject: String, scores: Object, finalScore: Number }],
    default: [],
  })
  subjects: SubjectScore[];

  @Prop()
  studentId: string;

  @Prop()
  major: string;
}

export type StudentDocument = HydratedDocument<Student>;
export const StudentSchema = SchemaFactory.createForClass(Student);
