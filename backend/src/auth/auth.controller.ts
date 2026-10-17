import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Authenticated, CurrentUser } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import type { SessionUser } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Staff login (Admin, Register, Report Viewer). The role comes from T_UserType. */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto.loginName, dto.password);
    res.cookie(this.auth.cookieName, await this.auth.issueToken(user), this.auth.cookieOptions());
    return { data: user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.auth.cookieName, this.auth.clearCookieOptions());
    return { data: { loggedOut: true } };
  }

  @Get('me')
  @Authenticated()
  me(@CurrentUser() user: SessionUser) {
    return { data: user };
  }
}
