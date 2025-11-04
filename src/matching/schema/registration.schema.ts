import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '@/user/schema/user.schema';
import { Course } from '@/course/schema/course.schema';

export enum RegistrationStatus {
  ASSIGNED = 'assigned',                    // Successfully registered and matched
  PENDING = 'pending',                  // Registered, awaiting automated matching
  COMPLETED = 'completed',              // Program finished
}

/*
This file defines a Mongoose schema for the Registration model 
i.e., how a registration document is stored in MongoDB.
*/

@Schema({ timestamps: true }) // The @Schema() decorator tells NestJS this class will become a Mongoose schema.
export class Registration {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  student: User;

  // This can be null if status is 'pending' for auto-matching
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  tutor?: User;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Course' })
  course: Course;

  @Prop({ required: true, enum: RegistrationStatus, default: RegistrationStatus.PENDING })
  status: RegistrationStatus; // active | pending | completed
}

export type RegistrationDocument = HydratedDocument<Registration>;
export const RegistrationSchema = SchemaFactory.createForClass(Registration);