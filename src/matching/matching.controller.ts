// src\matching\matching.controller.ts

import { Controller, Post, Body, UseGuards, Req, Get, Param, BadRequestException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';
import { RegisterProgramDto } from './dto/register-program.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { Request } from 'express';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  /**
   * STUDENT registers for a course/class group.
   * Requires authentication.
   */
  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Req() req: Request, @Body() dto: RegisterProgramDto) {
    const studentId = (req.user as any).userId;
    if (!studentId) throw new BadRequestException('Invalid or missing student ID');
    return this.matchingService.registerStudent(studentId, dto);
  }

  /**
   * TUTOR sets schedule for their assigned course/class group.
   * Requires authentication.
   */
  @UseGuards(JwtAuthGuard)
  @Post('schedule')
  async setSchedule(@Req() req: Request, @Body() dto: SetScheduleDto) {
    const tutorId = (req.user as any).userId;
    if (!tutorId) throw new BadRequestException('Invalid or missing tutor ID');
    return this.matchingService.setSchedule(tutorId, dto);
  }

  /**
   * ADMIN or TUTOR retrieves all class registrations.
   * (You can later restrict this route by role if needed.)
   */
  @UseGuards(JwtAuthGuard)
  @Get('registrations')
  async getAllRegistrations() {
    return this.matchingService.getAllRegistrations();
  }

  /**
   * STUDENT retrieves their own registrations.
   */
  @UseGuards(JwtAuthGuard)
  @Get('student/me')
  async getMyRegistrations(@Req() req: Request) {
    const studentId = (req.user as any).userId;
    if (!studentId) throw new BadRequestException('Invalid or missing user token');
    return this.matchingService.getStudentRegistrations(studentId);
  }

  /**
   * TUTOR retrieves all their assigned courses.
   */
  @UseGuards(JwtAuthGuard)
  @Get('tutor/me/courses')
  async getMyCourses(@Req() req: Request) {
    const tutorId = (req.user as any).userId;
    if (!tutorId) throw new BadRequestException('Invalid or missing tutor ID');
    return this.matchingService.getTutorCourses(tutorId);
  }

  /**
   * ADMIN retrieves all courses assigned to a specific tutor (optional helper route).
   */
  @Get('tutor/:tutorId/courses')
  async getTutorCourses(@Param('tutorId') tutorId: string) {
    if (!tutorId) throw new BadRequestException('Tutor ID is required');
    return this.matchingService.getTutorCourses(tutorId);
  }
}
