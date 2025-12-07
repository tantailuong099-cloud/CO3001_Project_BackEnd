import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'users' }) // Map chính xác vào collection 'users'
export class User {
  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  studentId: string;

  @Prop()
  major: string;

  @Prop({ type: [Object] }) // Chứa mảng các môn học và điểm
  subjects: Record<string, any>[];
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);