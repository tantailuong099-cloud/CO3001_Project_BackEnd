import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Tutor, TutorSchema } from '@/user/schema/tutor.schema'; // import Tutor schema
import { Registration, RegistrationSchema } from './schema/registration.schema';
import { UserModule } from '@/user/user.module';
import { CourseModule } from '@/course/course.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: Tutor.name, schema: TutorSchema },
    ]),
    UserModule,
    CourseModule,
    AuthModule,
  ],
  providers: [MatchingService],
  controllers: [MatchingController],
})
export class MatchingModule {}
