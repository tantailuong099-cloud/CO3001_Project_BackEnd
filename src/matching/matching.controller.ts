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
    @Query('courseId') courseId?: string,
    @Query('courseCode') courseCode?: string,
    @Query('classGroup') classGroup?: string,
  ) {
    // if (![UserRole.ADMIN, UserRole.TUTOR].includes(req.user.role)) {
    //   throw new ForbiddenException(
    //     'Only Admins or Tutors can view registrations',
    //   );
    // }

    return this.matchingService.getRegistrationsFiltered(
      courseId,
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
  @Get(':id')
  async getCourseDetail(@Param('id') id: string) {
    return this.matchingService.getClassDetailFromId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/student-progress')
  async getStudentProgress(@Param('id') id: string) {
    return this.matchingService.studentProgress(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Req() req: AuthRequest, @Body() dto: RegisterProgramDto) {
    if (req.user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can register');
    }
    console.log(dto);
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
    return this.matchingService.unregisterStudent(studentId, dto.registrationId);
  }

  // ------------------------------
  // READ Operations
  // ------------------------------

  /* ---------------------------------------------------------------------
   * ADMIN: Update registration fields (tutor, status)
   * --------------------------------------------------------------------- */
  @UseGuards(JwtAuthGuard)
  @Patch('registrations/:id')
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
