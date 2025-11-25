// src/report/report.controller.ts
import { Controller, Get, Query, InternalServerErrorException } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ... (STUDENT PERFORMANCE & EVALUATION giữ nguyên) ...
  // ──────────────── STUDENT PERFORMANCE ────────────────
  @Get('student-performance/summary')
  async getStudentPerformanceSummary(@Query() query: any) {
    try {
      const data = await this.reportService.getRawStudentPerformance(query);
      return { ok: true, report: 'student-performance-summary', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get student performance summary', error.message);
    }
  }

  @Get('student-performance/generate')
  async generateStudentPerformanceReport(@Query() query: any) {
    try {
      const data = await this.reportService.generateStudentPerformanceReport(query);
      return { ok: true, report: 'student-performance', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate student performance report', error.message);
    }
  }

  // ──────────────── STUDENT EVALUATION ────────────────
  @Get('student-evaluation/summary')
  async getStudentEvaluationSummary(@Query() query: any) {
    try {
      const data = await this.reportService.getRawStudentEvaluation(query);
      return { ok: true, report: 'student-evaluation-summary', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get student evaluation summary', error.message);
    }
  }

  @Get('student-evaluation/generate')
  async generateStudentEvaluationReport(@Query() query: any) {
    try {
      const data = await this.reportService.generateStudentEvaluationReport(query);
      return { ok: true, report: 'student-evaluation', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate student evaluation report', error.message);
    }
  }

  // ──────────────── RESOURCE ALLOCATION ────────────────
  
  // (Endpoint CŨ cho Modal)
  @Get('resource-allocation/summary')
  async getResourceSummary(@Query() query: any) {
    try {
      const data = await this.reportService.generateResourceReport(query);
      return { ok: true, report: 'resource-allocation-summary', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get resource summary', error.message);
    }
  }

  // (Endpoint CŨ cho Generate)
  @Get('resource-allocation/generate')
  async generateResourceReport(@Query() query: any) {
    try {
      const data = await this.reportService.generateResourceReport(query);
      return { ok: true, report: 'resource-allocation', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate resource report', error.message);
    }
  }

  // (Endpoint MỚI cho Bảng)
  @Get('resource-allocation/raw')
  async getResourceRawData(@Query() query: any) {
    try {
      const data = await this.reportService.getRawResourceAllocation(query);
      return { ok: true, report: 'resource-allocation-raw', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get raw resource data', error.message);
    }
  }

  // (Chart 1)
  @Get('resource-allocation/by-month')
  async getFacilityUsageByMonth(@Query() query: any) {
    try {
      const data = await this.reportService.getFacilityUsageByMonth(query);
      return { ok: true, report: 'resource-usage-by-month', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get usage by month', error.message);
    }
  }

  // (Chart 2)
  @Get('resource-allocation/by-type')
  async getFacilityTypeDistribution(@Query() query: any) {
    try {
      const data = await this.reportService.getFacilityTypeDistribution(query);
      return { ok: true, report: 'resource-type-distribution', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get type distribution', error.message);
    }
  }

  // (Chart 3)
  @Get('resource-allocation/occupancy-rate')
  async getOccupancyRate(@Query() query: any) {
    try {
      const data = await this.reportService.getOccupancyRate(query);
      return { ok: true, report: 'resource-occupancy-rate', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get occupancy rate', error.message);
    }
  }

  // (Chart 4)
  @Get('resource-allocation/weekly-heatmap')
  async getWeeklyHeatmap(@Query() query: any) {
    try {
      const data = await this.reportService.getWeeklyHeatmap(query);
      return { ok: true, report: 'resource-weekly-heatmap', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get weekly heatmap', error.message);
    }
  }

  // (Chart 5)
  @Get('resource-allocation/by-building')
  async getUsageByBuilding(@Query() query: any) {
    try {
      const data = await this.reportService.getUsageByBuilding(query);
      return { ok: true, report: 'resource-usage-by-building', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get usage by building', error.message);
    }
  }

  // (Chart 6)
  @Get('resource-allocation/stacked-usage')
  async getStackedFacilityUsage(@Query() query: any) {
    try {
      const data = await this.reportService.getStackedFacilityUsage(query);
      return { ok: true, report: 'resource-stacked-usage', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get stacked usage', error.message);
    }
  }

  // 🛑 ENDPOINT MỚI 1 (Student Chart 2) 🛑
  @Get('resource-allocation/student-engagement')
  async getStudentEngagement(@Query() query: any) {
    try {
      const data = await this.reportService.getStudentEngagement(query);
      return { ok: true, report: 'student-engagement', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get student engagement', error.message);
    }
  }

  // 🛑 ENDPOINT MỚI 2 (Student Chart 3) 🛑
  @Get('resource-allocation/support-by-faculty')
  async getSupportHoursByFaculty(@Query() query: any) {
    try {
      const data = await this.reportService.getSupportHoursByFaculty(query);
      return { ok: true, report: 'support-by-faculty', total: data.length, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get support by faculty', error.message);
    }
  }
}