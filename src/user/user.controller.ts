// CO3001_Project_BackEnd_main\src\user\user.controller.ts

import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { UpdateUserType, UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  /**
   * Get full student info for a list of emails
   * Example: GET /user/studen
   * ts?emails=aa@x.com,bb@x.com
   */

  @Get()
  async getAll() {
    return this.userService.getAll();
  }

  @Get('students')
  async getStudentsByEmails(@Query('emails') emails: string) {
    if (!emails) throw new BadRequestException('Emails query param required');
    const emailArray = emails.split(',').map((e) => e.trim());
    return this.userService.getStudentsByEmails(emailArray);
  }

  @Get('count')
  async getStudentAndTutorCount() {
    return this.userService.getStudentAndTutorCount();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Get('role/:role')
  async getUserListbyRole(@Param('role') role: 'Tutor' | 'Admin' | 'Student') {
    return this.userService.getUserListByRole(role);
  }

  // @Get()
  // async getUserListbyRole(@Query('role') role: 'Tutor' | 'Admin' | 'Student') {
  //   if (!role) throw new BadRequestException('Role query param required');
  //   return this.userService.getUserListByRole(role);
  // }

  @Post('update/:id')
  async updateUserInfo(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserType,
  ) {
    return this.userService.updateUserInfo(id, updateUserDto);
  }
}
