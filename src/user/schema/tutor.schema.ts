import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Tutor extends User {
  @Prop()
  courses: string[];
  @Prop()
  sharedMaterial: string[];
}

export type TutorDocument = HydratedDocument<Tutor>;
export const TutorSchema = SchemaFactory.createForClass(Tutor);
