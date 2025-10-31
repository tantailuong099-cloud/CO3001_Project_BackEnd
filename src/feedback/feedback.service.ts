import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedBack, FeedBackDocument } from './schema/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UserService } from '@/user/user.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(FeedBack.name) private feedbackModel: Model<FeedBackDocument>,
    private readonly userService: UserService,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    authorId: string,
  ): Promise<FeedBackDocument> {
    const { tutor: tutorId } = createFeedbackDto;
    await this.userService.updateUserInfo(tutorId, {});
    const newFeedback = new this.feedbackModel({
      // các fields trong model định nghĩa trong schema của nó
      ...createFeedbackDto,
      author: authorId,
    });

    return newFeedback.save();
  }

  async getForTutor(tutorId: string): Promise<FeedBackDocument[]> {
    return this.feedbackModel
      .find({ tutor: tutorId })
      .populate('author', 'name email')
      .exec();
  }
}
