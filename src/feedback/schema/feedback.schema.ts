import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '@/user/schema/user.schema';

@Schema({ timestamps: true })
export class FeedBack {
  @Prop({ required: true })
  content: string;

  @Prop({ type: Number, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' }) // ref đến UserModel để có ID chính xác
  author: User;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  tutor: User;
}

export type FeedBackDocument = HydratedDocument<FeedBack>;
export const FeedBackSchema = SchemaFactory.createForClass(FeedBack);
