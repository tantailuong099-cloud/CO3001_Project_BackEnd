// src/report/report.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument } from './schema/analytics-event.schema';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectModel('Report') //
    private readonly analyticsModel: Model<AnalyticsEventDocument>,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // 1 STUDENT PERFORMANCE
  // ──────────────────────────────────────────────────────────────
  async getRawStudentPerformance(query: any) {
    try {
      const match: any = { eventType: 'student-performance' };
      if (query.semester) match['metadata.semester'] = query.semester;
      if (query.program) match['metadata.program'] = query.program;
      
      // 🛑 THÊM DÒNG NÀY
      if (query.department) match['metadata.department'] = query.department;

      return this.analyticsModel.find(match).lean();
    } catch (error) {
      this.logger.error('Failed in getRawStudentPerformance', error.stack);
      throw error;
    }
  }

  async generateStudentPerformanceReport(query: any) {
    try {
      const match: any = { eventType: 'student-performance' };
      if (query.semester) match['metadata.semester'] = query.semester;
      if (query.program) match['metadata.program'] = query.program;
      
      // 🛑 THÊM DÒNG NÀY (Thêm vào cả hàm generate)
      if (query.department) match['metadata.department'] = query.department;

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
    } catch (error) {
      this.logger.error('Failed in generateStudentPerformanceReport', error.stack);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 2 STUDENT EVALUATION
  // ──────────────────────────────────────────────────────────────
  async getRawStudentEvaluation(query: any) {
    try {
      const match: any = { eventType: 'student-evaluation' };
      if (query.semester) match['metadata.semester'] = query.semester;
      if (query.program) match['metadata.program'] = query.program;

      // 🛑 THÊM DÒNG NÀY
      if (query.department) match['metadata.department'] = query.department;
      
      return this.analyticsModel.find(match).lean();
    } catch (error) {
      this.logger.error('Failed in getRawStudentEvaluation', error.stack);
      throw error;
    }
  }

  async generateStudentEvaluationReport(query: any) {
    try {
      const match: any = { eventType: 'student-evaluation' };
      if (query.semester) match['metadata.semester'] = query.semester;
      if (query.program) match['metadata.program'] = query.program;
      
      // 🛑 THÊM DÒNG NÀY (Thêm vào cả hàm generate)
      if (query.department) match['metadata.department'] = query.department;

      return this.analyticsModel.aggregate([
        { $match: match },
        {
          $addFields: {
            "normalizedConductScore": {
              $ifNull: [ 
                '$payload["Conduct Score"]', 
                { $ifNull: [ '$payload.ConductScore', '$payload["Conduct Score"]' ]}
              ]
            },
            "normalizedGPA4": {
              $ifNull: [ 
                '$payload["GPA (Scale 4)"]', 
                { $ifNull: [ '$payload.GPA4', '$payload["GPA (Scale 4)"]' ]}
              ]
            },
            "normalizedGPA10": {
              $ifNull: [ 
                '$payload["GPA (Scale 10)"]', 
                { $ifNull: [ '$payload.GPA10', '$payload["GPA (Scale 10)"]' ]}
              ]
            },
            "normalizedCumulativeGPA4": {
              $ifNull: [ 
                '$payload["Cumulative GPA (Scale 4)"]', 
                { $ifNull: [ '$payload.CumulativeGPA4', '$payload["Cumulative GPA (Scale 4)"]' ]}
              ]
            },
            "normalizedCumulativeGPA10": {
              $ifNull: [ 
                '$payload["Cumulative GPA (Scale 10)"]', 
                { $ifNull: [ '$payload.CumulativeGPA10', '$payload["Cumulative GPA (Scale 10)"]' ]}
              ]
            },
            "normalizedCredits": {
              $ifNull: [ 
                '$payload["Semester Credits"]', 
                { $ifNull: [ '$payload.SemesterCredits', '$payload["Semester Credits"]' ]}
              ]
            }
          }
        },
        {
          $group: {
            _id: '$normalizedConductScore', 
            avgGPA4: { $avg: '$normalizedGPA4' }, 
            avgGPA10: { $avg: '$normalizedGPA10' },
            avgCumulativeGPA4: { $avg: '$normalizedCumulativeGPA4' },
            avgCumulativeGPA10: { $avg: '$normalizedCumulativeGPA10' },
            avgCredits: { $avg: '$normalizedCredits' },
            totalStudents: { $sum: 1 },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { avgGPA10: -1 } },
      ]);
    } catch (error) {
      this.logger.error('Failed in generateStudentEvaluationReport', error.stack);
      throw error;
    }
  }


  // ──────────────────────────────────────────────────────────────
  // 3 RESOURCE ALLOCATION
  // (Giữ nguyên toàn bộ logic của phần này, đã ổn)
  // ──────────────────────────────────────────────────────────────
  
  // Hàm TẠO MATCH OBJECT chung
  private createResourceMatch(query: any) {
    const match: any = { eventType: 'resource-allocation' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;
    if (query.type) match['payload.type'] = query.type;
    return match;
  }

  // (Hàm BẢNG)
  async getRawResourceAllocation(query: any) {
    try {
      const match: any = { eventType: 'resource-allocation' };
      if (query.semester) match['metadata.semester'] = query.semester;
      if (query.program) match['metadata.program'] = query.program;
      if (query.type) {
        match['payload.type'] = query.type;
      } else {
        match['payload.type'] = 'resource';
      }
      return this.analyticsModel.find(match).lean();
    } catch (error)
    {
      this.logger.error('Failed in getRawResourceAllocation', error.stack);
      throw error;
    }
  }

  // (Hàm MODAL)
  async generateResourceReport(query: any) {
    try {
      const match = this.createResourceMatch(query);
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
    } catch (error) {
      this.logger.error('Failed in generateResourceReport', error.stack);
      throw error;
    }
  }

  // === CÁC HÀM CHO BIỂU ĐỒ ===

  // Chart 1 (Dùng cho Lecture & Student)
  async getFacilityUsageByMonth(query: any) {
    try {
      const match = this.createResourceMatch(query);
      return this.analyticsModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$payload.Month',
            value: { $sum: { $add: [ 
              { $ifNull: ['$payload.Teaching hours', 0] }, 
              { $ifNull: ['$payload.Support Hours', 0] } 
            ]}}
          }
        },
        { $project: { name: '$_id', value: 1, _id: 0 } },
        { $match: { name: { $ne: null } } }
      ]);
    } catch (error) {
      this.logger.error('Failed in getFacilityUsageByMonth', error.stack);
      throw error;
    }
  }

  // Chart 2 (Dùng cho Resource & Lecture)
  async getFacilityTypeDistribution(query: any) {
    try {
      const match = this.createResourceMatch(query);
      const isResource = !query.type || query.type === 'resource';
      
      const groupKey = isResource ? '$payload.Type' : '$payload.SessionType';
      const sumLogic = isResource ? { $sum: 1 } : { $sum: '$payload.Teaching hours' };
      
      if(isResource) match['payload.type'] = 'resource';
      else match['payload.type'] = 'lecture';
      
      return this.analyticsModel.aggregate([
        { $match: match },
        { $group: { _id: groupKey, value: sumLogic } },
        { $project: { name: '$_id', value: 1, _id: 0 } },
        { $match: { name: { $ne: null } } }
      ]);
    } catch (error) {
      this.logger.error('Failed in getFacilityTypeDistribution', error.stack);
      throw error;
    }
  }

  // Chart 3 (Chỉ dùng cho Resource)
  async getOccupancyRate(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'resource') return [];
      match['payload.type'] = 'resource';
      
      return this.analyticsModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$payload.Month',
            total: { $sum: 1 },
            occupied: { $sum: { $cond: [ { $eq: ['$payload.Status', 'Occupied'] }, 1, 0 ] } }
          }
        },
        {
          $project: {
            name: '$_id',
            value: { $multiply: [ { $divide: ['$occupied', '$total'] }, 100 ] },
            _id: 0
          }
        },
        { $match: { name: { $ne: null } } }
      ]);
    } catch (error) {
      this.logger.error('Failed in getOccupancyRate', error.stack);
      throw error;
    }
  }

  // Chart 4 (Chỉ dùng cho Lecture)
  async getWeeklyHeatmap(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'lecture') return [];
      match['payload.type'] = 'lecture';
      
      return this.analyticsModel.aggregate([
        { $match: match },
        { $addFields: { date: { $toDate: '$createdAt' } } },
        {
          $group: {
            _id: { 
              day: { $dayOfWeek: '$date' }, 
              hour_slot: { $floor: { $divide: [{ $hour: '$date' }, 6] } }
            }, 
            value: { $sum: 1 }
          }
        },
        { $project: { day: '$_id.day', hour_slot: '$_id.hour_slot', value: 1, _id: 0 } }
      ]);
    } catch (error) {
      this.logger.error('Failed in getWeeklyHeatmap', error.stack);
      throw error;
    }
  }

  // Chart 5 (Dùng cho Resource & Lecture)
  async getUsageByBuilding(query: any) {
    try {
      const match = this.createResourceMatch(query);
      const isResource = !query.type || query.type === 'resource';

      const groupKey = isResource ? '$payload.Building' : '$payload.Facility';
      const sumLogic = isResource ? { $sum: 1 } : { $sum: '$payload.Teaching hours' };
      
      if(isResource) match['payload.type'] = 'resource';
      else match['payload.type'] = 'lecture';
      
      return this.analyticsModel.aggregate([
        { $match: match },
        { $group: { _id: groupKey, value: sumLogic } },
        { $project: { name: '$_id', value: 1, _id: 0 } },
        { $match: { name: { $ne: null } } }
      ]);
    } catch (error) {
      this.logger.error('Failed in getUsageByBuilding', error.stack);
      throw error;
    }
  }

  // Chart 6 (Chỉ dùng cho Resource)
  async getStackedFacilityUsage(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'resource') return [];
      match['payload.type'] = 'resource';
      
      return this.analyticsModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { 
              month: { $ifNull: ['$payload.Month', 'N/A'] }, 
              type: '$payload.Type' 
            },
            value: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.month',
            types: { $push: { k: '$_id.type', v: '$value' } }
          }
        },
        { $project: { name: '$_id', data: { $arrayToObject: '$types' }, _id: 0 } },
        {
          $project: {
            name: 1,
            Classrooms: { $ifNull: ['$data.Classroom', 0] },
            Labs: { $ifNull: ['$data.Laboratory', 0] },
            Other: { $ifNull: ['$data.Other', 0] }
          }
        },
      ]);
    } catch (error) {
      this.logger.error('Failed in getStackedFacilityUsage', error.stack);
      throw error;
    }
  }

  // (Hàm mới 1 - Student Chart 2)
  async getStudentEngagement(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'student') return [];
      match['payload.type'] = 'student';
      
      return this.analyticsModel.aggregate([
        { $match: match },
        { $group: { _id: '$payload.AttendanceStatus', value: { $sum: 1 } } }, // Active vs Inactive
        { $project: { name: '$_id', value: 1, _id: 0 } },
        { $match: { name: { $ne: null } } }
      ]);
    } catch (error) {
      this.logger.error('Failed in getStudentEngagement', error.stack);
      throw error;
    }
  }

  // (Hàm mới 2 - Student Chart 3)
  async getSupportHoursByFaculty(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'student') return [];
      match['payload.type'] = 'student';
      
      return this.analyticsModel.aggregate([
        { $match: match },
        { $group: { _id: '$payload.Faculty', value: { $sum: '$payload.Support Hours' } } },
        { $project: { name: '$_id', value: 1, _id: 0 } },
        { $match: { name: { $ne: null } } }
      ]);
    } catch (error) {
      this.logger.error('Failed in getSupportHoursByFaculty', error.stack);
      throw error;
    }
  }

}