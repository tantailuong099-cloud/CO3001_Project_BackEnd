import { Controller, Post, Body, UseGuards, Req, Get, Param } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';
import { RegisterProgramDto } from './dto/register-program.dto';
import { Request } from 'express';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Body() dto: RegisterProgramDto, @Req() req: Request) {
    // studentId from token
    const studentId = (req.user as any).userId;
    return this.matchingService.registerStudent(dto, studentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tutor/:tutorId/assignments')
  async getForTutor(@Param('tutorId') tutorId: string) {
    return this.matchingService.getAssignmentsForTutor(tutorId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('student/me')
  async getMyRegistrations(@Req() req: Request) {
    const studentId = (req.user as any).userId;
    return this.matchingService.getRegistrationsForStudent(studentId);
  }
}
