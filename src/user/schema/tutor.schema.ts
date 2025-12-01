// CO3001_Project_BackEnd_main\src\user\schema\tutor.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import { HydratedDocument } from 'mongoose';

// Subdocument schema for constraints
@Schema({ _id: false })
export class Constraint {
  @Prop({ required: true })
  day: string; // e.g., "Monday" or "2025-11-01"

  @Prop({ required: true })
  startTime: string; // e.g., "09:00"

  @Prop({ required: true })
  endTime: string; // e.g., "11:00"
}

const ConstraintSchema = SchemaFactory.createForClass(Constraint);

@Schema({ timestamps: true })
export class Tutor extends User {
    // Courses this tutor can teach (courseCode)
  @Prop({ type: [String], default: [] })
  assignedCourses: string[];

  // Registration IDs this tutor is assigned to
  @Prop({ type: [String], default: [] })
  assignedGroups: string[];

  @Prop({ type: Number, default: 20 }) // Default 10 students
  maxStudents: number;

  @Prop({ type: [String], default: [] })
  sharedMaterial: string[];

  @Prop({ type: [ConstraintSchema], default: [] })
  constraints: Constraint[];
}

export type TutorDocument = HydratedDocument<Tutor>;
export const TutorSchema = SchemaFactory.createForClass(Tutor);
