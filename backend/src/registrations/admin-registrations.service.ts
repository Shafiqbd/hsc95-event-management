import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { DashboardStatsRow, RegistrationListRow, RegistrationRow, TShirtSummaryRow } from '../database/db-rows.js';
import { PhotoStorageService } from '../storage/photo-storage.service.js';
import { externalPhotoUrl, toRegistrationView, type PhotoUrlResolver, type RegistrationView } from './registration.views.js';

export interface RegistrationPage {
  items: RegistrationView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  totalRegistrations: number;
  activeRegistrations: number;
  withDriver: number;
  totalAmount: number;
  withPhoto: number;
  tokensReady: number;
  withPassCode: number;
  registeredToday: number;
  tShirtSizes: { size: string; total: number }[];
}

@Injectable()
export class AdminRegistrationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: PhotoStorageService,
  ) {}

  /** scope: EntryBy filter (a Register user's id) or null for all forms. */
  async list(search: string | undefined, page: number, pageSize: number, scope: number | null): Promise<RegistrationPage> {
    const rows = await this.db.call<RegistrationListRow>(this.db.fn.getRegistrationList, [
      search ?? null,
      pageSize,
      (page - 1) * pageSize,
      scope,
    ]);
    return {
      items: rows.map((row) => toRegistrationView(row, this.photoUrl)),
      total: rows.length > 0 ? Number(rows[0].TotalCount) : 0,
      page,
      pageSize,
    };
  }

  /** Out-of-scope forms are reported as not found, so ids cannot be probed. */
  async findOne(entryId: number, scope: number | null): Promise<RegistrationView> {
    const row = await this.db.callOne<RegistrationRow>(this.db.fn.getRegistrationById, [entryId, scope]);
    if (!row) throw new NotFoundException('Registration not found');
    return toRegistrationView(row, this.photoUrl);
  }

  async stats(scope: number | null): Promise<DashboardStats> {
    const [row, sizes] = await Promise.all([
      this.db.callOne<DashboardStatsRow>(this.db.fn.getDashboardStats, [scope]),
      this.db.call<TShirtSummaryRow>(this.db.fn.getTShirtSummary, [scope]),
    ]);
    if (!row) throw new Error('sp_get_dashboard_stats returned no row');
    return {
      totalRegistrations: Number(row.TotalRegistrations),
      activeRegistrations: Number(row.ActiveRegistrations),
      withDriver: Number(row.WithDriver),
      totalAmount: Number(row.TotalAmount),
      withPhoto: Number(row.WithPhoto),
      tokensReady: Number(row.TokensReady),
      withPassCode: Number(row.WithPassCode),
      registeredToday: Number(row.RegisteredToday),
      tShirtSizes: sizes.map((s) => ({ size: s.TShirtSize, total: Number(s.Total) })),
    };
  }

  /** Admin photo URLs point at the admin-only photo endpoint. */
  readonly photoUrl: PhotoUrlResolver = (photoPath) => {
    if (this.storage.isManagedKey(photoPath)) {
      return `/api/admin/photos/${this.storage.fileNameOf(photoPath)}`;
    }
    return externalPhotoUrl(photoPath);
  };
}
