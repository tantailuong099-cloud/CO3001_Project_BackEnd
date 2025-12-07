import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedBack, FeedBackDocument } from './schema/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UserService } from '@/user/user.service';
import {
  Registration,
  RegistrationDocument,
} from '@/matching/schema/registration.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(FeedBack.name) private feedbackModel: Model<FeedBackDocument>,
    @InjectModel(Registration.name)
    private registrationModel: Model<RegistrationDocument>,
    private readonly userService: UserService,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    authorId: string,
  ): Promise<FeedBackDocument> {
    const { courseId } = createFeedbackDto;
    // await this.userService.updateUserInfo(tutorId, {});
    const courseExsit = await this.registrationModel.findById(courseId);
    if (!courseExsit) {
      throw new NotFoundException(`Tutor with ID ${courseId} not found`);
    }

    const newFeedback = new this.feedbackModel({
      // các fields trong model định nghĩa trong schema của nó
      ...createFeedbackDto,
      author: authorId,
    });

    return await newFeedback.save();
  }

  async getForTutor(courseId: string): Promise<FeedBackDocument[]> {
    return this.feedbackModel.find({ courseId: courseId }).exec();
  }
}
