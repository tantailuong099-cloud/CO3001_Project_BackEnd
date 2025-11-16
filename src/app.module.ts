import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { MaterialsModule } from './materials/materials.module';
import { MatchingModule } from './matching/matching.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ReportModule } from './report/report.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    CourseModule,
    MaterialsModule,
    MatchingModule,
    FeedbackModule,
    ReportModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
