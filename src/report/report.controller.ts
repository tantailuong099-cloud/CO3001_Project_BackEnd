import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ──────────────── STUDENT PERFORMANCE ────────────────
  @Get('student-performance/summary')
  async getStudentPerformanceSummary(@Query() query: any) {
    const data = await this.reportService.getRawStudentPerformance(query);
    return { ok: true, report: 'student-performance-summary', total: data.length, data };
  }

  @Get('student-performance/generate')
  async generateStudentPerformanceReport(@Query() query: any) {
    const data = await this.reportService.generateStudentPerformanceReport(query);
    return { ok: true, report: 'student-performance', total: data.length, data };
  }

  // ──────────────── STUDENT EVALUATION ────────────────
  @Get('student-evaluation/summary')
  async getStudentEvaluationSummary(@Query() query: any) {
    const data = await this.reportService.getRawStudentEvaluation(query);
    return { ok: true, report: 'student-evaluation-summary', total: data.length, data };
  }

  @Get('student-evaluation/generate')
  async generateStudentEvaluationReport(@Query() query: any) {
    const data = await this.reportService.generateStudentEvaluationReport(query);
    return { ok: true, report: 'student-evaluation', total: data.length, data };
  }

  // ──────────────── RESOURCE ALLOCATION ────────────────
  @Get('resource-allocation/summary')
  async getResourceSummary(@Query() query: any) {
    const data = await this.reportService.getRawResourceAllocation(query);
    return { ok: true, report: 'resource-allocation-summary', total: data.length, data };
  }

  @Get('resource-allocation/generate')
  async generateResourceReport(@Query() query: any) {
    const data = await this.reportService.generateResourceReport(query);
    return { ok: true, report: 'resource-allocation', total: data.length, data };
  }
}
