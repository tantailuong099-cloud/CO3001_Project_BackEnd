import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Request } from 'express';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto, @Req() req: Request) {
    const authorId = (req.user as any).userId;
    return this.feedbackService.create(createFeedbackDto, authorId);
  }

  @UseGuards(JwtAuthGuard) // muốn đăng nhập r mới xem dc thì cứ dùng UseGuard
  @Get(':courseId')
  // Lấy giá trị của tham số 'tutorId' từ URL.
  getForTutor(@Param('courseId') courseId: string) {
    return this.feedbackService.getForTutor(courseId);
  }
}
