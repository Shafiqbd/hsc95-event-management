import { Module } from '@nestjs/common';
import { RegistrationsModule } from '../registrations/registrations.module.js';
import { TokensController } from './tokens.controller.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [RegistrationsModule],
  controllers: [TokensController],
  providers: [TokensService],
})
export class TokensModule {}
