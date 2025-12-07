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
    console.log('--- SERVICE: Received DTO:', createFeedbackDto);
    console.log('--- SERVICE: Received authorId:', authorId);

    const { tutor: tutorId } = createFeedbackDto;
    // await this.userService.updateUserInfo(tutorId, {});
    const tutorExists = await this.userService.findById(tutorId);
    if (!tutorExists) {
      throw new NotFoundException(`Tutor with ID ${tutorId} not found`);
    }

    const newFeedback = new this.feedbackModel({
      // các fields trong model định nghĩa trong schema của nó
      ...createFeedbackDto,
      author: authorId,
    });
    console.log('--- SERVICE: Document object BEFORE save:', newFeedback);

    try {
      const savedDocument = await newFeedback.save();
      console.log('--- SERVICE: Document AFTER save:', savedDocument);

      return savedDocument.toObject();
    } catch (error) {
      console.error('--- SERVICE: ERROR during .save() operation ---', error);
      throw error;
    }
    // return newFeedback.save();
  }

  async getForTutor(tutorId: string): Promise<FeedBackDocument[]> {
    return this.feedbackModel
      .find({ tutor: tutorId })
      .populate('author', 'name email')
      .exec();
  }
}
