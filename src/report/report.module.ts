// src/report/report.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { AnalyticsEventSchema } from './schema/analytics-event.schema';
import { CourseSchema } from './schema/course.schema';
import { RegistrationSchema } from './schema/registration.schema';
import { UserSchema } from './schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Report', schema: AnalyticsEventSchema },
      { name: 'Course', schema: CourseSchema },
      { name: 'Registration', schema: RegistrationSchema },
      // 👇 Đặt tên là 'ReportUser' để tránh lỗi OverwriteModelError với module khác
      { name: 'ReportUser', schema: UserSchema }, 
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}