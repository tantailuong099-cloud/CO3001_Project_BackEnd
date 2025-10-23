import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class FeedBack {
  @Prop({ required: true })
  content: string;
}

export type FeedBackDocument = HydratedDocument<FeedBack>;
export const FeedBackSchema = SchemaFactory.createForClass(FeedBack);
