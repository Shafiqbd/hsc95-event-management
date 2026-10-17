import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { DatabaseService } from '../database/database.service.js';
import type { UserListRow } from '../database/db-rows.js';
import type { CreateUserDto } from './dto/create-user.dto.js';

export interface UserSummary {
  userId: number;
  fullName: string;
  loginName: string;
  userTypeName: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** hsc95.sp_get_user_list() - never returns password hashes. */
  async list(): Promise<UserSummary[]> {
    const rows = await this.db.call<UserListRow>(this.db.fn.getUserList);
    return rows.map((row) => ({
      userId: row.UserId,
      fullName: row.FullName,
      loginName: row.LoginName,
      userTypeName: row.UserTypeName,
    }));
  }

  /**
   * Create a staff account with hsc95.sp_insert_user. The login-name check
   * and the insert share one transaction and an advisory lock, so two
   * admins cannot create the same login at the same time.
   */
  async create(dto: CreateUserDto): Promise<{ userId: number }> {
    const fn = this.db.fn;
    return this.db.transaction(async (client) => {
      const exists = await this.db.callOne<{ Exists: boolean }>(fn.checkLoginExists, [dto.loginName], client);
      if (exists?.Exists) throw new ConflictException('This login name is already taken');

      const created = await this.db.callOne<{ UserId: number }>(
        fn.insertUser,
        [
          dto.fullName,
          dto.loginName,
          dto.password,
          dto.email,
          dto.contactNumber ?? null,
          this.config.roles[dto.role].typeId,
          1,
        ],
        client,
      );
      if (!created) throw new Error('sp_insert_user returned no id');
      return { userId: created.UserId };
    });
  }
}
