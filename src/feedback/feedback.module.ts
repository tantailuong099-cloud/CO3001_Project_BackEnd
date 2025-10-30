import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedBack, FeedBackSchema } from './schema/feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedBack.name, schema: FeedBackSchema },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
