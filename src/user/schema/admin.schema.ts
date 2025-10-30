import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Admin extends User {
  @Prop()
  permissions: string[];
}

export type AdminDocument = HydratedDocument<Admin>;
export const AdminSchema = SchemaFactory.createForClass(Admin);
