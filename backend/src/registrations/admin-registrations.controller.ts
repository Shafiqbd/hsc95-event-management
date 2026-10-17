import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Authenticated, CurrentUser } from '../auth/auth.decorators.js';
import { entryScope, type SessionUser } from '../auth/auth.types.js';
import { PhotoStorageService } from '../storage/photo-storage.service.js';
import { sendPhoto } from '../storage/send-photo.js';
import { AdminRegistrationsService } from './admin-registrations.service.js';
import { ListRegistrationsQuery } from './dto/list-registrations.query.js';

@Controller('admin')
@Authenticated('admin', 'register', 'viewer')
export class AdminRegistrationsController {
  constructor(
    private readonly registrations: AdminRegistrationsService,
    private readonly storage: PhotoStorageService,
  ) {}

  @Get('stats')
  async stats(@CurrentUser() user: SessionUser) {
    return { data: await this.registrations.stats(entryScope(user)) };
  }

  @Get('registrations')
  async list(@Query() query: ListRegistrationsQuery, @CurrentUser() user: SessionUser) {
    return { data: await this.registrations.list(query.search, query.page, query.pageSize, entryScope(user)) };
  }

  @Get('registrations/:id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    if (id < 1 || id > 2_147_483_647) throw new NotFoundException('Registration not found');
    return { data: await this.registrations.findOne(id, entryScope(user)) };
  }

  @Get('photos/:fileName')
  async photo(@Param('fileName') fileName: string, @Res({ passthrough: true }) res: Response) {
    const key = this.storage.keyFromFileName(fileName);
    if (!key) throw new NotFoundException('Photo not found');
    return sendPhoto(this.storage, key, res);
  }
}
