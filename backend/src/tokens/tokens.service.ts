import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntryPassByIdRow } from '../database/db-rows.js';
import { AdminRegistrationsService } from '../registrations/admin-registrations.service.js';
import { toTokenView, type TokenView } from '../registrations/registration.views.js';

@Injectable()
export class TokensService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly registrations: AdminRegistrationsService,
  ) {}

  /**
   * Entry passes for the selected registrations (or all when entryIds is
   * null), limited to forms entered by `scope` when it is not null.
   */
  async byIds(entryIds: number[] | null, scope: number | null): Promise<TokenView[]> {
    const query = `
      SELECT *
      FROM sp_get_entrypass_by_ids($1::integer[], $2::integer);
    `;

    const rows: EntryPassByIdRow[] = await this.dataSource.query(query, [entryIds, scope]);
    return rows.map((row) => toTokenView(row, this.registrations.photoUrl));
  }
}
