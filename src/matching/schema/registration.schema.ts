// src\matching\schema\registration.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '@/user/schema/user.schema';
import { Course } from '@/course/schema/course.schema';

export enum RegistrationStatus {
  ASSIGNED = 'assigned',
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

  @Prop({ required: true, type: String })
  tutor?: String;

  @Prop({ required: true, type: String })
  course: String;

  @Prop({ required: true, type: String })
  classGroup: string;

  @Prop({ enum: RegistrationStatus, default: RegistrationStatus.ASSIGNED })
  status: RegistrationStatus;
}

export type RegistrationDocument = HydratedDocument<Registration>;
export const RegistrationSchema = SchemaFactory.createForClass(Registration);