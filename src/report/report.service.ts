import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument } from './schema/analytics-event.schema';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel('Report')
    private readonly analyticsModel: Model<AnalyticsEventDocument>,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // 1 STUDENT PERFORMANCE
  // ──────────────────────────────────────────────────────────────
  async getRawStudentPerformance(query: any) {
    const match: any = { eventType: 'student-performance' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;

    return this.analyticsModel.find(match).lean();
  }

  async generateStudentPerformanceReport(query: any) {
    const match: any = { eventType: 'student-performance' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;

    return this.analyticsModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$payload["Class Name"]',
          avgScore4: { $avg: '$payload["Score(Scale 4)"]' },
          avgScore10: { $avg: '$payload["Score(Scale 10)"]' },
          avgLab: { $avg: '$payload["Lab score"]' },
          avgAssignment: { $avg: '$payload["Assignment score"]' },
          avgFinal: { $avg: '$payload["Final exam score"]' },
          totalStudents: { $sum: 1 },
        },
      },
      { $sort: { avgScore10: -1 } },
    ]);
  }

  // ──────────────────────────────────────────────────────────────
  // 2 STUDENT EVALUATION
  // ──────────────────────────────────────────────────────────────
  async getRawStudentEvaluation(query: any) {
    const match: any = { eventType: 'student-evaluation' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;
    return this.analyticsModel.find(match).lean();
  }

  async generateStudentEvaluationReport(query: any) {
    const match: any = { eventType: 'student-evaluation' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;

    return this.analyticsModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$payload["Conduct Score"]',
          avgGPA4: { $avg: '$payload["GPA (Scale 4)"]' },
          avgGPA10: { $avg: '$payload["GPA (Scale 10)"]' },
          avgCumulativeGPA4: { $avg: '$payload["Cumulative GPA (Scale 4)"]' },
          avgCumulativeGPA10: { $avg: '$payload["Cumulative GPA (Scale 10)"]' },
          avgCredits: { $avg: '$payload["Semester Credits"]' },
          totalStudents: { $sum: 1 },
        },
      },
      { $sort: { avgGPA10: -1 } },
    ]);
  }

  // ──────────────────────────────────────────────────────────────
  // 3 RESOURCE ALLOCATION
  // ──────────────────────────────────────────────────────────────
  async getRawResourceAllocation(query: any) {
    const match: any = { eventType: 'resource-allocation' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;
    if (query.type) match['payload.type'] = query.type;
    return this.analyticsModel.find(match).lean();
  }

  

  async generateResourceReport(query: any) {
    const match: any = { eventType: 'resource-allocation' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;
    if (query.type) match['payload.type'] = query.type;

    return this.analyticsModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$payload.type',
          totalAttendance: { $sum: '$payload.AttendanceCount' },
          totalTeachingHours: { $sum: '$payload["Teaching hours"]' },
          totalSessions: { $sum: '$payload.SessionCount' },
          avgLoad: { $avg: '$payload["Avg Load"]' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}
