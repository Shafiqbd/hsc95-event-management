import { Body, Controller, Get, Post } from '@nestjs/common';
import { Authenticated } from '../auth/auth.decorators.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('admin/users')
@Authenticated('admin')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list() {
    return { data: await this.users.list() };
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return { data: await this.users.create(dto) };
  }
}
