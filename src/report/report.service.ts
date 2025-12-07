// src/report/report.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEventDocument } from './schema/analytics-event.schema';
import { RegistrationDocument } from './schema/registration.schema';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectModel('Report')
    private readonly analyticsModel: Model<AnalyticsEventDocument>,
    
    @InjectModel('Registration')
    private readonly registrationModel: Model<RegistrationDocument>,
  ) {}

  // ===========================================================================
  // 1. HELPER: Pipeline TRUNG TÂM
  // ===========================================================================
  private getStudentDataPipeline(query: any) {
    const pipeline: any[] = [];

    // Filter & Lookup
    if (query.semester) { pipeline.push({ $match: { semester: query.semester } }); }
    
    pipeline.push({ $lookup: { from: 'courses', localField: 'courseCode', foreignField: 'courseCode', as: 'courseInfo' } });
    pipeline.push({ $unwind: '$courseInfo' });
    
    if (query.department) { pipeline.push({ $match: { 'courseInfo.department': query.department } }); }
    
    pipeline.push({ $unwind: '$students' });
    
    pipeline.push({ $lookup: { from: 'users', localField: 'students', foreignField: 'email', as: 'userInfo' } });
    pipeline.push({ $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } });
    
    // Lấy điểm môn học
    pipeline.push({
      $addFields: {
        matchedSubject: {
          $arrayElemAt: [
            {
              $filter: {
                input: { $ifNull: ['$userInfo.subjects', []] },
                as: 'subj',
                cond: { $eq: ['$$subj.Subject', '$courseInfo.courseName'] }
              }
            }, 0
          ]
        }
      }
    });

    return pipeline;
  }

  // ===========================================================================
  // 2. HELPER: Logic Chuyển đổi điểm hệ 10 -> Hệ 4 (Fix lỗi TypeScript tại đây)
  // ===========================================================================
  // 🛑 SỬA: Đổi 'fieldPath: string' thành 'expr: any' để nhận được object $ifNull
  private getGPAScale4Logic(expr: any) {
    return {
      $switch: {
        branches: [
          { case: { $gte: [expr, 8.5] }, then: 4.0 }, // A, A+
          { case: { $gte: [expr, 8.0] }, then: 3.5 }, // B+
          { case: { $gte: [expr, 7.0] }, then: 3.0 }, // B
          { case: { $gte: [expr, 6.5] }, then: 2.5 }, // C+
          { case: { $gte: [expr, 5.5] }, then: 2.0 }, // C
          { case: { $gte: [expr, 5.0] }, then: 1.5 }, // D+
          { case: { $gte: [expr, 4.0] }, then: 1.0 }, // D
        ],
        default: 0.0 // F
      }
    };
  }

  // ──────────────────────────────────────────────────────────────
  // 3. STUDENT PERFORMANCE
  // ──────────────────────────────────────────────────────────────
  async getRawStudentPerformance(query: any) {
    try {
      const pipeline = this.getStudentDataPipeline(query);

      pipeline.push({
        $project: {
          _id: 1,
          eventType: { $literal: 'student-performance' },
          metadata: {
            semester: '$semester',
            department: '$courseInfo.department',
            program: '$courseInfo.department'
          },
          payload: {
            "Student ID": { $ifNull: ['$userInfo.studentId', 'N/A'] },
            // Tách tên
            "First Name": { $let: { vars: { parts: { $split: [{ $ifNull: ['$userInfo.name', 'Unknown Name'] }, " "] } }, in: { $arrayElemAt: ["$$parts", 0] } } },
            "Last Name": { $let: { vars: { parts: { $split: [{ $ifNull: ['$userInfo.name', 'Unknown'] }, " "] } }, in: { $arrayElemAt: ["$$parts", -1] } } },
            "Class Name": { $concat: ['$courseCode', ' - ', '$classGroup'] },
            
            // ✅ ĐIỂM HỆ 4 (Giờ đã hết lỗi đỏ vì hàm nhận any)
            "Score(Scale 4)": this.getGPAScale4Logic({ $ifNull: ['$matchedSubject.finalScore', 0] }),
            
            // ✅ ĐIỂM HỆ 10 (Làm tròn 2 số)
            "Score(Scale 10)": { $round: [{ $ifNull: ['$matchedSubject.finalScore', 0] }, 2] },
            
            // ✅ CÁC ĐIỂM THÀNH PHẦN
            "Lab score": { $round: [{ $ifNull: ['$matchedSubject.scores.midterm', 0] }, 2] },        
            "Assignment score": { $round: [{ $ifNull: ['$matchedSubject.scores.project', 0] }, 2] },  
            "Final exam score": { $round: [{ $ifNull: ['$matchedSubject.scores.final', 0] }, 2] },
          }
        }
      });

      return await this.registrationModel.aggregate(pipeline);
    } catch (error) {
      this.logger.error('Failed in getRawStudentPerformance', error.stack);
      throw error;
    }
  }

  async generateStudentPerformanceReport(query: any) {
    try {
      const pipeline = this.getStudentDataPipeline(query);
      
      // Chuẩn bị dữ liệu để tính toán
      pipeline.push({
        $project: {
          class: { $concat: ['$courseCode', ' - ', '$classGroup'] },
          score10: { $ifNull: ['$matchedSubject.finalScore', 0] },
          // Fix logic gọi hàm helper
          score4: this.getGPAScale4Logic({ $ifNull: ['$matchedSubject.finalScore', 0] }),
          lab: { $ifNull: ['$matchedSubject.scores.midterm', 0] },
          assign: { $ifNull: ['$matchedSubject.scores.project', 0] },
          final: { $ifNull: ['$matchedSubject.scores.final', 0] },
        }
      });

      // Group theo lớp
      pipeline.push({
        $group: {
          _id: '$class',
          avgScore4: { $avg: '$score4' },
          avgScore10: { $avg: '$score10' },
          avgLab: { $avg: '$lab' },
          avgAssignment: { $avg: '$assign' },
          avgFinal: { $avg: '$final' },
          totalStudents: { $sum: 1 },
        },
      });
      
      pipeline.push({ $sort: { avgScore10: -1 } });

      return await this.registrationModel.aggregate(pipeline);
    } catch (error) {
      this.logger.error('Failed in generateStudentPerformanceReport', error.stack);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 4. STUDENT EVALUATION
  // ──────────────────────────────────────────────────────────────
  async getRawStudentEvaluation(query: any) {
    try {
      const pipeline = this.getStudentDataPipeline(query);

      pipeline.push({
        $project: {
          _id: 1,
          eventType: { $literal: 'student-evaluation' },
          metadata: { semester: '$semester', department: '$courseInfo.department' },
          payload: {
            "Student ID": { $ifNull: ['$userInfo.studentId', 'N/A'] },
            "First Name": { $let: { vars: { parts: { $split: [{ $ifNull: ['$userInfo.name', 'Unknown Name'] }, " "] } }, in: { $arrayElemAt: ["$$parts", 0] } } },
            "Last Name": { $let: { vars: { parts: { $split: [{ $ifNull: ['$userInfo.name', 'Unknown'] }, " "] } }, in: { $arrayElemAt: ["$$parts", -1] } } },
            "Class Name": { $concat: ['$courseCode', ' - ', '$classGroup'] },
            
            // ✅ GPA MÔN HỌC (Hệ 4)
            "GPA (Scale 4)": this.getGPAScale4Logic({ $ifNull: ['$matchedSubject.finalScore', 0] }),
            
            // ✅ GPA MÔN HỌC (Hệ 10)
            "GPA (Scale 10)": { $round: [{ $ifNull: ['$matchedSubject.finalScore', 0] }, 2] },
            
            // Conduct Score (Participation * 10 -> Làm tròn)
            "Conduct Score": { $round: [{ $multiply: [{ $ifNull: ['$matchedSubject.scores.participation', 0] }, 10] }, 0] },
            
            // Tạm thời map Cumulative = GPA môn này
            "Cumulative GPA (Scale 4)": this.getGPAScale4Logic({ $ifNull: ['$matchedSubject.finalScore', 0] }),
            "Cumulative GPA (Scale 10)": { $round: [{ $ifNull: ['$matchedSubject.finalScore', 0] }, 2] },
            
            "Semester Credits": { $literal: 4 }, 
            "Accumulated Credits": { $literal: 100 }
          }
        }
      });

      return await this.registrationModel.aggregate(pipeline);
    } catch (error) {
      this.logger.error('Failed in getRawStudentEvaluation', error.stack);
      throw error;
    }
  }

  async generateStudentEvaluationReport(query: any) {
    try {
      const pipeline = this.getStudentDataPipeline(query);

      pipeline.push({
        $project: {
          normalizedConductScore: { $multiply: [{ $ifNull: ['$matchedSubject.scores.participation', 0] }, 10] },
          // Fix logic gọi hàm helper
          normalizedGPA4: this.getGPAScale4Logic({ $ifNull: ['$matchedSubject.finalScore', 0] }),
          normalizedGPA10: { $ifNull: ['$matchedSubject.finalScore', 0] },
          normalizedCumulativeGPA4: this.getGPAScale4Logic({ $ifNull: ['$matchedSubject.finalScore', 0] }),
          normalizedCumulativeGPA10: { $ifNull: ['$matchedSubject.finalScore', 0] },
          normalizedCredits: { $literal: 4 }
        }
      });

      pipeline.push({
        $group: {
          _id: '$normalizedConductScore', 
          avgGPA4: { $avg: '$normalizedGPA4' }, 
          avgGPA10: { $avg: '$normalizedGPA10' },
          avgCumulativeGPA4: { $avg: '$normalizedCumulativeGPA4' },
          avgCumulativeGPA10: { $avg: '$normalizedCumulativeGPA10' },
          avgCredits: { $avg: '$normalizedCredits' },
          totalStudents: { $sum: 1 },
        },
      });

      pipeline.push({ $match: { _id: { $ne: null } } });
      pipeline.push({ $sort: { avgGPA10: -1 } });

      return await this.registrationModel.aggregate(pipeline);
    } catch (error) {
      this.logger.error('Failed in generateStudentEvaluationReport', error.stack);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 3. RESOURCE ALLOCATION (GIỮ NGUYÊN)
  // ──────────────────────────────────────────────────────────────
  
  private createResourceMatch(query: any) {
    const match: any = { eventType: 'resource-allocation' };
    if (query.semester) match['metadata.semester'] = query.semester;
    if (query.program) match['metadata.program'] = query.program;
    if (query.type) match['payload.type'] = query.type;
    return match;
  }

  async getRawResourceAllocation(query: any) {
    try {
      const match: any = { eventType: 'resource-allocation' };
      if (query.semester) match['metadata.semester'] = query.semester;
      if (query.program) match['metadata.program'] = query.program;
      if (query.type) { match['payload.type'] = query.type; } else { match['payload.type'] = 'resource'; }
      return this.analyticsModel.find(match).lean();
    } catch (error) {
      this.logger.error('Failed in getRawResourceAllocation', error.stack);
      throw error;
    }
  }

  async generateResourceReport(query: any) {
    try {
      const match = this.createResourceMatch(query);
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: '$payload.type', totalAttendance: { $sum: '$payload.AttendanceCount' }, totalTeachingHours: { $sum: '$payload["Teaching hours"]' }, totalSessions: { $sum: '$payload.SessionCount' }, avgLoad: { $avg: '$payload["Avg Load"]' }, count: { $sum: 1 }, }, }, { $sort: { count: -1 } }, ]);
    } catch (error) {
      this.logger.error('Failed in generateResourceReport', error.stack);
      throw error;
    }
  }

  // === CÁC HÀM CHO BIỂU ĐỒ (Giữ nguyên) ===
  async getFacilityUsageByMonth(query: any) {
    try {
      const match = this.createResourceMatch(query);
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: '$payload.Month', value: { $sum: { $add: [ { $ifNull: ['$payload.Teaching hours', 0] }, { $ifNull: ['$payload.Support Hours', 0] } ]}} } }, { $project: { name: '$_id', value: 1, _id: 0 } }, { $match: { name: { $ne: null } } } ]);
    } catch (error) { this.logger.error('Failed in getFacilityUsageByMonth', error.stack); throw error; }
  }

  async getFacilityTypeDistribution(query: any) {
    try {
      const match = this.createResourceMatch(query);
      const isResource = !query.type || query.type === 'resource';
      const groupKey = isResource ? '$payload.Type' : '$payload.SessionType';
      const sumLogic = isResource ? { $sum: 1 } : { $sum: '$payload.Teaching hours' };
      if(isResource) match['payload.type'] = 'resource'; else match['payload.type'] = 'lecture';
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: groupKey, value: sumLogic } }, { $project: { name: '$_id', value: 1, _id: 0 } }, { $match: { name: { $ne: null } } } ]);
    } catch (error) { this.logger.error('Failed in getFacilityTypeDistribution', error.stack); throw error; }
  }

  async getOccupancyRate(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'resource') return [];
      match['payload.type'] = 'resource';
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: '$payload.Month', total: { $sum: 1 }, occupied: { $sum: { $cond: [ { $eq: ['$payload.Status', 'Occupied'] }, 1, 0 ] } } } }, { $project: { name: '$_id', value: { $multiply: [ { $divide: ['$occupied', '$total'] }, 100 ] }, _id: 0 } }, { $match: { name: { $ne: null } } } ]);
    } catch (error) { this.logger.error('Failed in getOccupancyRate', error.stack); throw error; }
  }

  async getWeeklyHeatmap(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'lecture') return [];
      match['payload.type'] = 'lecture';
      return this.analyticsModel.aggregate([ { $match: match }, { $addFields: { date: { $toDate: '$createdAt' } } }, { $group: { _id: { day: { $dayOfWeek: '$date' }, hour_slot: { $floor: { $divide: [{ $hour: '$date' }, 6] } } }, value: { $sum: 1 } } }, { $project: { day: '$_id.day', hour_slot: '$_id.hour_slot', value: 1, _id: 0 } } ]);
    } catch (error) { this.logger.error('Failed in getWeeklyHeatmap', error.stack); throw error; }
  }

  async getUsageByBuilding(query: any) {
    try {
      const match = this.createResourceMatch(query);
      const isResource = !query.type || query.type === 'resource';
      const groupKey = isResource ? '$payload.Building' : '$payload.Facility';
      const sumLogic = isResource ? { $sum: 1 } : { $sum: '$payload.Teaching hours' };
      if(isResource) match['payload.type'] = 'resource'; else match['payload.type'] = 'lecture';
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: groupKey, value: sumLogic } }, { $project: { name: '$_id', value: 1, _id: 0 } }, { $match: { name: { $ne: null } } } ]);
    } catch (error) { this.logger.error('Failed in getUsageByBuilding', error.stack); throw error; }
  }

  async getStackedFacilityUsage(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'resource') return [];
      match['payload.type'] = 'resource';
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: { month: { $ifNull: ['$payload.Month', 'N/A'] }, type: '$payload.Type' }, value: { $sum: 1 } } }, { $group: { _id: '$_id.month', types: { $push: { k: '$_id.type', v: '$value' } } } }, { $project: { name: '$_id', data: { $arrayToObject: '$types' }, _id: 0 } }, { $project: { name: 1, Classrooms: { $ifNull: ['$data.Classroom', 0] }, Labs: { $ifNull: ['$data.Laboratory', 0] }, Other: { $ifNull: ['$data.Other', 0] } } }, ]);
    } catch (error) { this.logger.error('Failed in getStackedFacilityUsage', error.stack); throw error; }
  }

  async getStudentEngagement(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'student') return [];
      match['payload.type'] = 'student';
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: '$payload.AttendanceStatus', value: { $sum: 1 } } }, { $project: { name: '$_id', value: 1, _id: 0 } }, { $match: { name: { $ne: null } } } ]);
    } catch (error) { this.logger.error('Failed in getStudentEngagement', error.stack); throw error; }
  }

  async getSupportHoursByFaculty(query: any) {
    try {
      const match = this.createResourceMatch(query);
      if (query.type && query.type !== 'student') return [];
      match['payload.type'] = 'student';
      return this.analyticsModel.aggregate([ { $match: match }, { $group: { _id: '$payload.Faculty', value: { $sum: '$payload.Support Hours' } } }, { $project: { name: '$_id', value: 1, _id: 0 } }, { $match: { name: { $ne: null } } } ]);
    } catch (error) { this.logger.error('Failed in getSupportHoursByFaculty', error.stack); throw error; }
  }
}