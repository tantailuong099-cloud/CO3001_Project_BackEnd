import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum DocumentType {
  SHARED = 'shared',
  OFFICAIL = 'official',
}

@Schema({ timestamps: true })
export class Material {
  @Prop({ required: true })
  materialName: string;

  @Prop({ required: true })
  overview: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  pdfUrl: string;

  @Prop({
    enum: DocumentType,
    default: DocumentType.SHARED,
  })
  type: DocumentType;

  @Prop({ default: null })
  sharedType: string;
}

export type MaterialDocument = HydratedDocument<Material>;
export const MaterialSchema = SchemaFactory.createForClass(Material);
