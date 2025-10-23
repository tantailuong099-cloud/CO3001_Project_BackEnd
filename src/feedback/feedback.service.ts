import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedBack, FeedBackDocument } from './schema/feedback.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(FeedBack.name) private feedbackModel: Model<FeedBackDocument>,
  ) {}
}
