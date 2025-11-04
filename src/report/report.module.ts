// src/report/report.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { AnalyticsEventSchema } from './schema/analytics-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Report', schema: AnalyticsEventSchema }, // 👈 đổi name ở đây
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
