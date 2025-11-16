// src\matching\matching.module.ts
import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Registration, RegistrationSchema } from './schema/registration.schema';
import { UserModule } from '@/user/user.module';
import { CourseModule } from '@/course/course.module';
import { AuthModule } from '@/auth/auth.module';
import { User, UserSchema } from '@/user/schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UserModule,
    CourseModule,
    AuthModule,
  ],
  providers: [MatchingService],
  controllers: [MatchingController],
})
export class MatchingModule {}
