import { Controller, Post, Body, UseGuards, Req, Get, Param, BadRequestException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';
import { RegisterProgramDto } from './dto/register-program.dto';
import { SetConstraintsDto } from './dto/set-constraints.dto';
import { Request } from 'express';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  /**
   * Allows a student to register for a program.
   * Requires a valid JWT token.
   */
  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Body() dto: RegisterProgramDto, @Req() req: Request) {
    // studentId from token
    const studentId = (req.user as any).userId;
    return this.matchingService.registerStudent(dto, studentId);
  }

  /**
   * Retrieves all student assignments for a specific tutor.
   * This route can be accessed by tutors and admins.
   */
  //@UseGuards(JwtAuthGuard)
  @Get('tutor/:tutorId/assignments')
  async getForTutor(@Param('tutorId') tutorId: string) {
    if (!tutorId) {
      throw new BadRequestException('Tutor ID is required');
    }
    return this.matchingService.getAssignmentsForTutor(tutorId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('student/me')
  async getMyRegistrations(@Req() req: Request) {
    const studentId = (req.user as any).userId;
    if (!studentId) {
      throw new BadRequestException('Invalid or missing user token');
    }
    return this.matchingService.getRegistrationsForStudent(studentId);
  }

  /**
   * Allows a tutor to set matching constraints.
   * Example: availability, preferred subjects, or capacity.
   */
  @Post('tutor/:tutorId/constraints')
  async setConstraints(@Param('tutorId') tutorId: string, @Body() dto: SetConstraintsDto) {
    if (!tutorId) {
      throw new BadRequestException('Tutor ID is required');
    }

    return this.matchingService.setConstraints(tutorId, dto);
  }
}
