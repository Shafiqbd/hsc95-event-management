import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
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
    private readonly dataSource: DataSource,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** sp_get_user_list() - never returns password hashes. */
  async list(): Promise<UserSummary[]> {
    const query = `
      SELECT *
      FROM sp_get_user_list();
    `;

    const rows: UserListRow[] = await this.dataSource.query(query);

    return rows.map((row) => ({
      userId: row.UserId,
      fullName: row.FullName,
      loginName: row.LoginName,
      userTypeName: row.UserTypeName,
    }));
  }

  /**
   * Create a staff account with sp_insert_user. The login-name check and the
   * insert share one transaction and an advisory lock, so two admins cannot
   * create the same login at the same time.
   */
  async create(dto: CreateUserDto): Promise<{ userId: number }> {
    return this.dataSource.transaction(async (manager) => {
      const [exists]: { Exists: boolean }[] = await manager.query(
        `SELECT sp_check_login_exists($1::varchar) AS "Exists";`,
        [dto.loginName],
      );
      if (exists?.Exists) throw new ConflictException('This login name is already taken');

      const query = `
        SELECT sp_insert_user($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::numeric, $7::numeric) AS "UserId";
      `;

      const [created]: { UserId: number }[] = await manager.query(query, [
        dto.fullName,
        dto.loginName,
        dto.password,
        dto.email,
        dto.contactNumber ?? null,
        this.config.roles[dto.role].typeId,
        1,
      ]);
      if (!created) throw new Error('sp_insert_user returned no id');

      return { userId: created.UserId };
    });
  }
}
