import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Authenticated, CurrentUser } from '../auth/auth.decorators.js';
import type { SessionUser } from '../auth/auth.types.js';
import { SmsService } from '../sms/sms.service.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { RegistrationsService, type UploadedPhoto } from './registrations.service.js';

@Controller()
export class RegistrationsController {
  constructor(
    private readonly registrations: RegistrationsService,
    private readonly sms: SmsService,
  ) {}

  /** Fee rules used by the registration form (amount shown = amount stored). */
  @Get('event')
  event() {
    return { data: this.registrations.eventFees() };
  }

  /** Enter a member's registration (multipart/form-data with a "photo" file). */
  @Post('registrations')
  @Authenticated('admin', 'register')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('photo'))
  async create(
    @Body() dto: CreateRegistrationDto,
    @UploadedFile() photo: UploadedPhoto | undefined,
    @CurrentUser() user: SessionUser,
  ) {
    const result = await this.registrations.register(dto, photo, user.userId);
    // First SMS ("Dear <name>, your registration completed."), sent once the
    // registration is saved; a failure is reported but never undoes the save.
    const sms = await this.sms.sendRegistrationNotice({
      entryId: result.entryId,
      memberName: dto.memberName,
      mobileNo: dto.mobileNo,
    });
    return { data: { ...result, paymentStatus: 'unverified' as const, sms } };
  }
}
