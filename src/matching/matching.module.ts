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
import { Material, MaterialSchema } from '@/materials/schema/materials.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: User.name, schema: UserSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
    UserModule,
    CourseModule,
    AuthModule,
  ],
  providers: [MatchingService],
  controllers: [MatchingController],
  exports: [MongooseModule],
})
export class MatchingModule {}
