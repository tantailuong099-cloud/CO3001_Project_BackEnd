// src/matching/matching.controller.ts

import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';
import { RegisterProgramDto } from './dto/register-program.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { Request } from 'express';
import { UserRole } from '@/user/schema/user.schema';
import { AddSessionDto } from './dto/add-session.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

export interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // ------------------------------
  // STUDENT: Register / Unregister
  // ------------------------------

  /**
   * STUDENT registers for a course/class group.
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-course')
  async getClassFromUserId(@Req() req: AuthRequest) {
    const userId = req.user.userId;
    return this.matchingService.getClassFromUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-session')
  async addSession(@Req() req: AuthRequest, @Body() dto: AddSessionDto) {
    // Chỉ cho phép Admin hoặc Tutor
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.TUTOR) {
      throw new ForbiddenException('Only Tutors or Admins can add sessions');
    }

    const userId = req.user.userId;
    const userRole = req.user.role;

    return this.matchingService.addSession(userId, userRole, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('attendance')
  async updateAttendance(
    @Req() req: AuthRequest,
    @Body() dto: UpdateAttendanceDto,
  ) {
    // Chỉ cho phép Admin hoặc Tutor
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.TUTOR) {
      throw new ForbiddenException('Only Tutors or Admins can mark attendance');
    }

    const userId = req.user.userId;
    return this.matchingService.updateAttendance(userId, req.user.role, dto);
  }

  /**
   * ADMIN or TUTOR retrieves all class registrations.
   */
  @UseGuards(JwtAuthGuard)
  @Get('registrations')
  async getRegistrations(
    @Req() req: AuthRequest,
    @Query('courseCode') courseCode?: string,
    @Query('classGroup') classGroup?: string,
  ) {
    if (![UserRole.ADMIN, UserRole.TUTOR].includes(req.user.role)) {
      throw new ForbiddenException(
        'Only Admins or Tutors can view registrations',
      );
    }

    return this.matchingService.getRegistrationsFiltered(
      courseCode,
      classGroup,
    );
  }

  /**
   * STUDENT retrieves their own registrations.
   */
  @UseGuards(JwtAuthGuard)
  @Get('student/me')
  async getMyRegistrations(@Req() req: AuthRequest) {
    if (req.user.role !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'Only students can view their registrations',
      );
    }
    const studentId = req.user.userId;
    return this.matchingService.getStudentRegistrations(studentId);
  }

  /**
   * TUTOR retrieves all their assigned courses.
   */
  @UseGuards(JwtAuthGuard)
  @Get('tutor/me/courses')
  async getMyCourses(@Req() req: AuthRequest) {
    if (req.user.role !== UserRole.TUTOR) {
      throw new ForbiddenException(
        'Only tutors can view their assigned courses',
      );
    }
    const tutorId = req.user.userId;
    return this.matchingService.getTutorCourses(tutorId);
  }

  /**
   * ADMIN retrieves all courses assigned to a specific tutor.
   */
  @UseGuards(JwtAuthGuard)
  @Get('tutor/:tutorId/courses')
  async getTutorCourses(
    @Req() req: AuthRequest,
    @Param('tutorId') tutorId: string,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can view tutor courses');
    }
    return this.matchingService.getTutorCourses(tutorId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/student-progress')
  async getStudentProgress(@Param('id') id: string) {
    return this.matchingService.studentProgress(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getCourseDetail(@Param('id') id: string) {
    return this.matchingService.getClassDetailFromId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Req() req: AuthRequest, @Body() dto: RegisterProgramDto) {
    if (req.user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can register');
    }
    const studentId = req.user.userId;
    return this.matchingService.registerStudent(studentId, dto);
  }

  /**
   * STUDENT unregisters from a course/class group.
   */
  @UseGuards(JwtAuthGuard)
  @Post('unregister')
  async unregister(@Req() req: AuthRequest, @Body() dto: RegisterProgramDto) {
    if (req.user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can unregister');
    }
    const studentId = req.user.userId;
    return this.matchingService.unregisterStudent(
      studentId,
      dto.course,
      dto.classGroup,
    );
  }

  // ------------------------------
  // TUTOR: Set schedule for assigned class group
  // ------------------------------

  /**
   * TUTOR sets schedule for their assigned course/class group.
   */
  @UseGuards(JwtAuthGuard)
  @Post('schedule')
  async setSchedule(@Req() req: AuthRequest, @Body() dto: SetScheduleDto) {
    if (req.user.role !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can set schedule');
    }
    const tutorId = req.user.userId;
    return this.matchingService.setSchedule(tutorId, dto);
  }

  // ------------------------------
  // ADMIN: Assign / Unassign tutors to class groups
  // ------------------------------

  /**
   * ADMIN assigns tutor to a class group.
   */
  @UseGuards(JwtAuthGuard)
  @Post('assign-tutor')
  async assignTutor(
    @Req() req: AuthRequest,
    @Body('tutorId') tutorId: string,
    @Body('courseId') courseId: string,
    @Body('classGroup') classGroup: string,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can assign tutors');
    }
    return this.matchingService.assignTutor(tutorId, courseId, classGroup);
  }

  /**
   * ADMIN unassigns tutor from a class group.
   */
  @UseGuards(JwtAuthGuard)
  @Post('unassign-tutor')
  async unassignTutor(
    @Req() req: AuthRequest,
    @Body('courseId') courseId: string,
    @Body('classGroup') classGroup: string,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can unassign tutors');
    }
    return this.matchingService.unassignTutor(courseId, classGroup);
  }

  // ------------------------------
  // READ Operations
  // ------------------------------

  /* ---------------------------------------------------------------------
   * ADMIN: Update registration fields (tutor, status)
   * --------------------------------------------------------------------- */
  @UseGuards(JwtAuthGuard)
  @Patch('registration/:id')
  async updateRegistration(
    @Req() req: AuthRequest,
    @Param('id') registrationId: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can update registrations');
    }
    return this.matchingService.updateRegistration(registrationId, dto);
  }

  /**
   * ADMIN deletes a registration (class group).
   */
  @UseGuards(JwtAuthGuard)
  @Delete('registrations/:courseCode/:classGroup')
  async deleteRegistration(
    @Req() req: AuthRequest,
    @Param('courseCode') courseCode: string,
    @Param('classGroup') classGroup: string,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can delete registrations');
    }

    return this.matchingService.deleteRegistrationByCourseGroup(
      courseCode,
      classGroup,
    );
  }
}
