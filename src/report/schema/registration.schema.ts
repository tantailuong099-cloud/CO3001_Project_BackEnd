import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'registrations' })
export class Registration {
  @Prop()
  courseCode: string;

  @Prop()
  classGroup: string;

  @Prop()
  semester: string;

  @Prop([String])
  students: string[];
}

export type RegistrationDocument = Registration & Document;
export const RegistrationSchema = SchemaFactory.createForClass(Registration);