import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { UpdateUserType, UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Get(':role')
  async getUserListbyRole(@Param('role') role: 'Tutor' | 'Admin' | 'Student') {
    return this.userService.getUserListByRole(role);
  }

  @Post('update/:id')
  async updateUserInfo(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserType,
  ) {
    return this.userService.updateUserInfo(id, updateUserDto);
  }
}
