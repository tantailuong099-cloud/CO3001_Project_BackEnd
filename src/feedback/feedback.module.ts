import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedBack, FeedBackSchema } from './schema/feedback.schema';
import { UserModule } from '@/user/user.module';
import { AuthModule } from '@/auth/auth.module';
import {
  Registration,
  RegistrationSchema,
} from '@/matching/schema/registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedBack.name, schema: FeedBackSchema },
      { name: Registration.name, schema: RegistrationSchema },
    ]),
    UserModule,
    AuthModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
