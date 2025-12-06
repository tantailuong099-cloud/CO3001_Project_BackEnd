// CO3001_Project_BackEnd_main\src\user\schema\user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum UserRole {
  STUDENT = 'Student',
  ADMIN = 'Admin',
  TUTOR = 'Tutor',
}

@Schema({ discriminatorKey: 'role', timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  role: UserRole;
  // @Prop({ required: true, enum: ['Admin', 'Student', 'Tutor'] })
  // role: string;
  //role?: 'Tutor' | 'Student' | 'Admin';

  @Prop()
  avatar?: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
