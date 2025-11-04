import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AssignTutorDto } from './dto/assign-tutor.dto';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @UseGuards(JwtAuthGuard) 
  @Post('create')
  async createCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.createCourse(createCourseDto);
  }

  @Get()
  async getAllCourses() {
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
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.courseService.updateCourse(id, updateCourseDto);
  }

  @UseGuards(JwtAuthGuard) 
  @Delete('delete/:id')
  async deleteCourse(@Param('id') id: string) {
    return this.courseService.deleteCourse(id);
  }

  @UseGuards(JwtAuthGuard) 
  @Post(':id/assign-tutor')
  async assignTutorToCourse(
    @Param('id') id: string,
    @Body() assignTutorDto: AssignTutorDto,
  ) {
    return this.courseService.assignTutorToCourse(id, assignTutorDto.tutorId);
  }

  @UseGuards(JwtAuthGuard) 
  @Post(':id/register')
  async registerStudent(
    @Param('id') id: string,
    @Body('studentId') studentId: string, 
  ) {
    return this.courseService.registerStudentForCourse(id, studentId);
  }
}