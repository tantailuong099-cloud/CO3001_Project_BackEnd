import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class FeedBack {
  @Prop({ required: true })
  content: string;

  @Prop({ type: Number, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true }) // ref đến UserModel để có ID chính xác
  author: string;

  @Prop({ required: true })
  courseId: string;
}

export type FeedBackDocument = HydratedDocument<FeedBack>;
export const FeedBackSchema = SchemaFactory.createForClass(FeedBack);
