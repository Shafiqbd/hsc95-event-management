import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { EntryPassByIdRow, EntryPassRow } from '../database/db-rows.js';
import { AdminRegistrationsService } from '../registrations/admin-registrations.service.js';
import { toTokenView, type TokenView } from '../registrations/registration.views.js';

@Injectable()
export class TokensService {
  constructor(
    private readonly db: DatabaseService,
    private readonly registrations: AdminRegistrationsService,
  ) {}

  /** Every eligible entry pass, via the supplied hsc95.sp_prepare_entrypass(). */
  async all(): Promise<TokenView[]> {
    const rows = await this.db.call<EntryPassRow>(this.db.fn.prepareEntryPass);
    return rows.map((row) => toTokenView(row, this.registrations.photoUrl));
  }

  /**
   * Entry passes for the selected registrations (or all when entryIds is
   * null), limited to forms entered by `scope` when it is not null.
   */
  async byIds(entryIds: number[] | null, scope: number | null): Promise<TokenView[]> {
    const rows = await this.db.call<EntryPassByIdRow>(this.db.fn.getEntryPassByIds, [entryIds, scope]);
    return rows.map((row) => toTokenView(row, this.registrations.photoUrl));
  }
}
