import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { Tutor, TutorSchema } from './schema/tutor.schema';
import { Student, StudentSchema } from './schema/student.schema';
import { Admin, AdminSchema } from './schema/admin.schema';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: () => {
          const schema = UserSchema;
          schema.discriminator(Tutor.name, TutorSchema);
          schema.discriminator(Student.name, StudentSchema);
          schema.discriminator(Admin.name, AdminSchema);
          return schema;
        },
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, MongooseModule], // ✅ Add this line
})
export class UserModule {}
