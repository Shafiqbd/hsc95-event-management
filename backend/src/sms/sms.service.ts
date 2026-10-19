import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { tokenNumber } from '../common/token-number.js';
import type { EntryPassByIdRow } from '../database/db-rows.js';

/** Messages sent in parallel per batch (keeps the gateway and the 30 s proxy happy). */
const CONCURRENCY = 5;
const GATEWAY_TIMEOUT_MS = 15_000;
/** bulksmsbd.net: 202 = "SMS Submitted Successfully". */
const GATEWAY_OK = 202;

interface GatewayBody {
  response_code?: number | string;
  error_message?: string;
  success_message?: string;
}

/** T_SMSLog."SMSFor": what the message was about. */
export type SmsPurpose = 'REG' | 'TOKEN';

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

/** Outcome of the automatic "registration completed" SMS. */
export type RegistrationSmsStatus = 'sent' | 'failed' | 'skipped';

class SmsNotConfiguredException extends HttpException {
  constructor() {
    super('SMS sending is not configured on the server.', HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export { tokenNumber };

/**
 * Fill the SMS template: {name} = member name, {token} = four-digit token
 * number, {counter} = counter number. Unknown placeholders are left as is.
 */
export function renderSmsMessage(template: string, values: { name: string; token: string; counter: string }): string {
  return template.replace(/\{(name|token|counter)\}/g, (_, key: keyof typeof values) => values[key]);
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private get configured(): boolean {
    return Boolean(this.config.sms.apiKey && this.config.sms.senderId);
  }

  /**
   * First SMS, sent right after a registration is saved:
   * "Dear <name>, your registration completed." Never throws: the
   * registration is already saved, so a failed SMS is only reported.
   */
  async sendRegistrationNotice(entry: { entryId: number; memberName: string; mobileNo: string }): Promise<RegistrationSmsStatus> {
    if (!this.configured) return 'skipped';
    const { registrationMessage, counterNo } = this.config.sms;
    const message = renderSmsMessage(registrationMessage, { name: entry.memberName.trim(), token: '', counter: counterNo });
    try {
      const reason = await this.deliver('REG', entry.entryId, entry.mobileNo, message);
      return reason === null ? 'sent' : 'failed';
    } catch (error) {
      this.logger.error(`Registration SMS for entry ${entry.entryId} failed: ${describe(error)}`);
      return 'failed';
    }
  }

  /**
   * Second SMS, sent from the Tokens page: every selected member gets the
   * SMS_API_MESSAGE template ("Dear <name>, ... 95-<token>, counter no
   * #<counter>"). Only registrations that are eligible for a token (active,
   * with a form number) are messaged.
   */
  async sendTokenNumbers(entryIds: number[]): Promise<SmsBatchResult> {
    if (!this.configured) throw new SmsNotConfiguredException();

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
      const results = await Promise.all(rows.slice(i, i + CONCURRENCY).map((row) => this.sendToken(row)));
      for (const failure of results) {
        if (failure) failed.push(failure);
        else sent += 1;
      }
    }

    return { requested: entryIds.length, sent, failed };
  }

  /** Returns null on success, or why it failed. */
  private async sendToken(row: EntryPassByIdRow): Promise<SmsFailure | null> {
    const formNo = row.FormNo === null ? null : Number(row.FormNo);
    const fail = (reason: string): SmsFailure => ({ entryId: row.EntryId, formNo, mobileNo: row.MobileNo, reason });
    if (formNo === null) return fail('No token number');

    const { message, counterNo } = this.config.sms;
    const text = renderSmsMessage(message, { name: row.MemberName.trim(), token: tokenNumber(formNo), counter: counterNo });
    try {
      const reason = await this.deliver('TOKEN', row.EntryId, row.MobileNo, text);
      return reason === null ? null : fail(reason);
    } catch (error) {
      this.logger.error(`Token SMS for entry ${row.EntryId} failed: ${describe(error)}`);
      return fail('Could not record the SMS');
    }
  }

  /**
   * Send one SMS and keep the books: the request goes into T_SMSLog
   * (sp_insert_sms_request), the gateway's answer is stored with
   * sp_update_sms_response ("OK"/"FAIL"), and an accepted SMS adds one to the
   * registration's TotalSMSSent (sp_increment_sms_sent).
   * Returns null when the gateway accepted it, otherwise the reason.
   */
  private async deliver(purpose: SmsPurpose, entryId: number, mobileNo: string | null, message: string): Promise<string | null> {
    const mobile = mobileNo?.trim() ?? '';
    if (!/^01[3-9]\d{8}$/.test(mobile)) return 'Invalid mobile number';

    const [log]: { LogID: string }[] = await this.dataSource.query(
      `SELECT sp_insert_sms_request($1::varchar, $2::varchar, $3::text) AS "LogID";`,
      [purpose, mobile, message],
    );

    const { ok, reason, responseText } = await this.callGateway(mobile, message);
    if (!ok) this.logger.warn(`${purpose} SMS to entry ${entryId} failed: ${reason}`);

    // Book-keeping problems are logged but never turn a sent SMS into a failure.
    await this.dataSource
      .query(`SELECT sp_update_sms_response($1::bigint, $2::varchar, $3::text) AS "Updated";`, [
        log?.LogID ?? null,
        ok ? 'OK' : 'FAIL',
        responseText,
      ])
      .catch((error: unknown) => this.logger.error(`Could not store the SMS response for entry ${entryId}: ${describe(error)}`));
    if (ok) {
      await this.dataSource
        .query(`SELECT sp_increment_sms_sent($1::integer) AS "TotalSMSSent";`, [entryId])
        .catch((error: unknown) => this.logger.error(`Could not count the SMS for entry ${entryId}: ${describe(error)}`));
    }
    return ok ? null : reason;
  }

  /** POST to bulksmsbd.net exactly as the gateway expects. Never throws. */
  private async callGateway(mobile: string, message: string): Promise<{ ok: boolean; reason: string; responseText: string }> {
    const { apiUrl, apiKey, senderId } = this.config.sms;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, senderid: senderId, number: `88${mobile}`, message }),
        signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
      });
      const raw = await response.text();
      let body: GatewayBody | null = null;
      try {
        body = JSON.parse(raw) as GatewayBody;
      } catch {
        body = null;
      }
      const ok = response.ok && Number(body?.response_code) === GATEWAY_OK;
      const reason = ok
        ? ''
        : body?.error_message || body?.success_message || `Gateway answered HTTP ${response.status}`;
      return { ok, reason, responseText: raw.slice(0, 2000) };
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError' ? 'SMS gateway timed out' : 'SMS gateway unreachable';
      return { ok: false, reason, responseText: `${reason}: ${describe(error)}` };
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
