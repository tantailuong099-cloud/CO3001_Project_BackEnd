import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import { HydratedDocument } from 'mongoose';

export interface Constraint {
  day: Date; // Ngày (có thể chỉ lấy phần yyyy-mm-dd)
  startTime: Date; // Thời điểm bắt đầu rảnh
  endTime: Date; // Thời điểm kết thúc rảnh
}

@Schema()
export class Tutor extends User {
  @Prop()
  expertise: string;
  @Prop()
  courses: string[];
  @Prop()
  sharedMaterial: string[];
  @Prop()
  constraints: Constraint[];
}

export type TutorDocument = HydratedDocument<Tutor>;
export const TutorSchema = SchemaFactory.createForClass(Tutor);
