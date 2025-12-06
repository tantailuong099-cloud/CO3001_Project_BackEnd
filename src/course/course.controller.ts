// CO3001_Project_BackEnd_main\src\course\course.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Patch,
  UseGuards,
  Req,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';
import { UserRole } from '@/user/schema/user.schema';
import { Request } from 'express';
import { AssignTutorDto } from './dto/assign-tutor.dto';

interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  // ------------------------------
  // COURSE CRUD
  // ------------------------------

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createCourse(@Body() dto: CreateCourseDto, @Req() req: AuthRequest) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can create courses');
    }
    return this.courseService.createCourse(dto);
  }

  @Get()
  async getCourses(@Query('courseCode') courseCode: string) {
    if (courseCode) {
      return this.courseService.getCoursesByCode(courseCode);
    }
    return this.courseService.getAllCourses();
  }

  @Get(':id')
  async getCourseById(@Param('id') id: string) {
    return this.courseService.getCourseById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @Req() req: AuthRequest,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can update courses');
    }
    return this.courseService.updateCourse(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:id')
  async deleteCourse(@Param('id') id: string, @Req() req: AuthRequest) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admins can delete courses');
    }
    return this.courseService.deleteCourse(id);
  }

  // @UseGuards(JwtAuthGuard)
  // @Post(':id/assign-tutor')
  // async assignTutorToCourse(
  //   @Param('id') id: string,
  //   @Body() assignTutorDto: AssignTutorDto,
  //   @Req() req: AuthRequest,
  // ) {
  //   if (req.user.role !== 'Admin') {
  //     throw new ForbiddenException('Only Admins can assign tutors');
  //   }
  //   return await this.courseService.assignTutorToCourse(
  //     id,
  //     assignTutorDto.courseId,
  //   );
  // }

  // @UseGuards(JwtAuthGuard)
  // @Post(':id/unassign-tutor')
  // async unassignTutorFromCourse(
  //   @Param('id') id: string,
  //   @Body() assignTutorDto: AssignTutorDto,
  //   @Req() req: AuthRequest,
  // ) {
  //   if (req.user.role !== UserRole.ADMIN) {
  //     throw new ForbiddenException('Only admins can unassign tutors');
  //   }
  //   return this.courseService.unassignTutorFromCourse(
  //     id,
  //     assignTutorDto.courseId,
  //   );
  // }

  @UseGuards(JwtAuthGuard)
  @Post(':id/register')
  async registerStudent(@Param('id') id: string, @Req() req: AuthRequest) {
    if (req.user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can register for courses');
    }
    const studentId = req.user.userId;
    return this.courseService.registerStudentForCourse(id, studentId);
  }

  // @UseGuards(JwtAuthGuard)
  // @Post(':id/unregister')
  // async unregisterStudent(@Param('id') id: string, @Req() req: AuthRequest) {
  //   if (req.user.role !== UserRole.STUDENT) {
  //     throw new ForbiddenException('Only students can unregister');
  //   }
  //   const studentId = req.user.userId;
  //   return this.courseService.unregisterStudentForCourse(id, studentId);
  // }
}
