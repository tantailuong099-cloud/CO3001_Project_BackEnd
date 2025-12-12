// src\matching\schema\registration.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export class Material {
  @Prop({ type: [String], default: [] })
  general: string[];

  @Prop({ type: [String], default: [] })
  reference: string[];

  @Prop({ type: [String], default: [] })
  slide: string[];
}

export class Session {
  @Prop({ required: true })
  day: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ default: "" })
  form: string;

  @Prop({ default: "" })
  location: string;

  @Prop({ type: [String], default: [] })
  studentAttemp: string[];
}

/*
 * This schema represents a "Class Roster".
 * ONE document will exist for EACH class group of one course (e.g., "SE 251 - Group A").
 * It holds the list of all students registered for that one course.
 */


@Schema({ timestamps: true }) // The @Schema() decorator tells NestJS this class will become a Mongoose schema.
export class Registration {

  // link to Course (REAL ObjectId)
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ required: true, type: String })
  courseCode: string;

  @Prop({ required: true, type: String })
  classGroup: string;

  // Assigned tutor (optional)
  @Prop({ type: String, required: false })
  tutor?: string;

  @Prop({ type: [String], default: [] })
  students: string[];
  
  @Prop({ type: [Session], default: [] })
  sessions: Session[];

  @Prop({ type: Number, default: 0 })
  registeredCount: number;

  @Prop({ type: Material, default: {} })
  materials: Material;
}

export type RegistrationDocument = HydratedDocument<Registration>;
export const RegistrationSchema = SchemaFactory.createForClass(Registration);
