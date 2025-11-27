// src\matching\schema\registration.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum RegistrationStatus {
  CREATED = 'created',            // initial
  TUTOR_ASSIGNED = 'tutor_assigned',
  ACTIVE = 'active',              // students registered or active period
  CLOSED = 'closed',              // after registration period ends
}

/*
 * This schema represents a "Class Roster".
 * ONE document will exist for EACH class group of one course (e.g., "SE 251 - Group A").
 * It holds the list of all students registered for that one course.
*/

@Schema({ timestamps: true }) // The @Schema() decorator tells NestJS this class will become a Mongoose schema.
export class Registration {
  @Prop({ type: [String], default: [] })
  students: String[];

  // Assigned tutor (optional)
  @Prop({ type: String, required: false })
  tutor?: string;

  @Prop({ required: true, type: String })
  course: String;

  @Prop({ type: Number, default: 0 })
  registeredCount: number;

  @Prop({ required: true, type: String })
  classGroup: string;

    // Schedule for this class group
  @Prop({ 
    type: [{ day: String, startTime: String, endTime: String }],
    default: [],
  })
  sessions: { day: string; startTime: string; endTime: string }[];

  @Prop({ enum: RegistrationStatus, default: RegistrationStatus.CREATED })
  status: RegistrationStatus;
}

export type RegistrationDocument = HydratedDocument<Registration>;
export const RegistrationSchema = SchemaFactory.createForClass(Registration);