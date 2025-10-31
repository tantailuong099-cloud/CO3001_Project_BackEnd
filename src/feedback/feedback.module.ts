import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedBack, FeedBackSchema } from './schema/feedback.schema';
import { UserModule } from '@/user/user.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedBack.name, schema: FeedBackSchema },
    ]),
    UserModule,
    AuthModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
