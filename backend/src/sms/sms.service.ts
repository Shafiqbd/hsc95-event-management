import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import type { EntryPassByIdRow } from '../database/db-rows.js';

/** Messages sent in parallel per batch (keeps the gateway and the 30 s proxy happy). */
const CONCURRENCY = 5;
const GATEWAY_TIMEOUT_MS = 15_000;
/** bulksmsbd.net: 202 = "SMS Submitted Successfully". */
const GATEWAY_OK = 202;

export interface SmsFailure {
  entryId: number;
  formNo: number | null;
  mobileNo: string | null;
  reason: string;
}

export interface SmsBatchResult {
  requested: number;
  sent: number;
  failed: SmsFailure[];
}

class SmsNotConfiguredException extends HttpException {
  constructor() {
    super('SMS sending is not configured on the server.', HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/** "0043": the token (form) number as the four digits printed on the pass. */
export function tokenNumber(formNo: number): string {
  return String(formNo).padStart(4, '0');
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Send every selected member "<message>: <token no.>". Only registrations
   * that are eligible for a token (active, with a form number) are messaged.
   */
  async sendTokenNumbers(entryIds: number[]): Promise<SmsBatchResult> {
    const { apiKey, senderId } = this.config.sms;
    if (!apiKey || !senderId) throw new SmsNotConfiguredException();

    const query = `
      SELECT *
      FROM sp_get_entrypass_by_ids($1::integer[], $2::integer);
    `;
    const rows: EntryPassByIdRow[] = await this.dataSource.query(query, [entryIds, null]);

    const found = new Set(rows.map((r) => r.EntryId));
    const failed: SmsFailure[] = entryIds
      .filter((id) => !found.has(id))
      .map((entryId) => ({ entryId, formNo: null, mobileNo: null, reason: 'Not an active registration with a token number' }));

    let sent = 0;
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const results = await Promise.all(rows.slice(i, i + CONCURRENCY).map((row) => this.sendOne(row)));
      for (const failure of results) {
        if (failure) failed.push(failure);
        else sent += 1;
      }
    }

    this.logger.log(`SMS batch: ${sent} sent, ${failed.length} failed of ${entryIds.length} requested`);
    return { requested: entryIds.length, sent, failed };
  }

  /** Returns null on success, or why it failed. */
  private async sendOne(row: EntryPassByIdRow): Promise<SmsFailure | null> {
    const formNo = row.FormNo === null ? null : Number(row.FormNo);
    const fail = (reason: string): SmsFailure => ({ entryId: row.EntryId, formNo, mobileNo: row.MobileNo, reason });

    const mobile = row.MobileNo?.trim() ?? '';
    if (!/^01[3-9]\d{8}$/.test(mobile)) return fail('Invalid mobile number');
    if (formNo === null) return fail('No token number');

    const { apiUrl, apiKey, senderId, message } = this.config.sms;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          senderid: senderId,
          number: `88${mobile}`,
          message: `${message}: ${tokenNumber(formNo)}`,
        }),
        signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      });
      const body = (await response.json().catch(() => null)) as {
        response_code?: number | string;
        error_message?: string;
        success_message?: string;
      } | null;
      if (response.ok && Number(body?.response_code) === GATEWAY_OK) return null;

      const reason = body?.error_message || body?.success_message || `Gateway answered HTTP ${response.status}`;
      this.logger.warn(`SMS to entry ${row.EntryId} failed [${body?.response_code ?? response.status}]: ${reason}`);
      return fail(reason);
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError' ? 'SMS gateway timed out' : 'SMS gateway unreachable';
      this.logger.warn(`SMS to entry ${row.EntryId} failed: ${error instanceof Error ? error.message : String(error)}`);
      return fail(reason);
    }
  }
}
