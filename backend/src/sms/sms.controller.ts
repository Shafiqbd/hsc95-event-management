import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Authenticated } from '../auth/auth.decorators.js';
import { SendSmsDto } from './dto/send-sms.dto.js';
import { SmsService } from './sms.service.js';

@Controller('admin/sms')
@Authenticated('admin')
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  /** Send the selected members their token number ("...: 0043"). One batch of up to 50. */
  @Post('token-numbers')
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async sendTokenNumbers(@Body() dto: SendSmsDto) {
    return { data: await this.sms.sendTokenNumbers(dto.entryIds) };
  }
}
