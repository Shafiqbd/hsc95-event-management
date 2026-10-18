import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
    private readonly storage: PhotoStorageService,
  ) {}

  /** scope: EntryBy filter (a Register user's id) or null for all forms. */
  async list(search: string | undefined, page: number, pageSize: number, scope: number | null): Promise<RegistrationPage> {
    const query = `
      SELECT *
      FROM sp_get_registration_list($1::text, $2::integer, $3::integer, $4::integer);
    `;

    const rows: RegistrationListRow[] = await this.dataSource.query(query, [
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
    const query = `
      SELECT *
      FROM sp_get_registration_by_id($1::integer, $2::integer);
    `;

    const [row]: RegistrationRow[] = await this.dataSource.query(query, [entryId, scope]);
    if (!row) throw new NotFoundException('Registration not found');
    return toRegistrationView(row, this.photoUrl);
  }

  async stats(scope: number | null): Promise<DashboardStats> {
    const [[row], sizes]: [DashboardStatsRow[], TShirtSummaryRow[]] = await Promise.all([
      this.dataSource.query(`SELECT * FROM sp_get_dashboard_stats($1::integer);`, [scope]),
      this.dataSource.query(`SELECT * FROM sp_get_tshirt_summary($1::integer);`, [scope]),
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
