// src/report/schema/analytics-event.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'report' })
export class AnalyticsEvent {
  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Object })
  payload: Record<string, any>;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;
}

export type AnalyticsEventDocument = AnalyticsEvent & Document;
export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
