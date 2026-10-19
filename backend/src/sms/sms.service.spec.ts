import type { DataSource } from 'typeorm';
import { FakeDataSource, testConfig } from '../../test/helpers.js';
import { SmsService, tokenNumber } from './sms.service.js';

const SMS_ENV = {
  SMS_API_URL: 'http://sms.test/api/smsapi',
  SMS_API_KEY: 'key123',
  SMS_API_SENDER_KEY: '8809600000000',
  SMS_API_MESSAGE: 'Dear {name}, your registration completed. You token # is 95-{token}, counter no #{counter}',
};

const row = (entryId: number, formNo: string | null, mobileNo: string | null) => ({
  EntryId: entryId,
  MemberName: entryId === 1 ? 'Shah Mohammad Abdul Aziz' : `M${entryId}`,
  FormNo: formNo,
  MobileNo: mobileNo,
  PhotoPath: null,
  CollegeName: null,
  TShirtSize: 'L',
  IncludeDriver: 'N',
});

function setup(env: Record<string, string> = SMS_ENV) {
  let logId = 0;
  const db = new FakeDataSource()
    .on('sp_get_entrypass_by_ids', () => [
      row(1, '1', '01711111111'),
      row(2, '7', '01711111111'), // same mobile, different form: still gets its own SMS
      row(3, '8', '12345'),
    ])
    .on('sp_insert_sms_request', () => [{ LogID: String(++logId) }])
    .on('sp_update_sms_response', () => [{ Updated: true }])
    .on('sp_increment_sms_sent', () => [{ TotalSMSSent: '1' }]);
  const service = new SmsService(db as unknown as DataSource, testConfig(env));
  return { db, service };
}

const gateway = (code: number) =>
  vi.fn(async () => new Response(JSON.stringify({ response_code: code, success_message: 'ok', error_message: code === 202 ? '' : 'Bad' })));

describe('SmsService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('formats the token number with four digits', () => {
    expect(tokenNumber(43)).toBe('0043');
    expect(tokenNumber(12345)).toBe('12345');
  });

  it('sends each member their own token number and reports what failed', async () => {
    const fetchMock = gateway(202);
    vi.stubGlobal('fetch', fetchMock);
    const { db, service } = setup();

    const result = await service.sendTokenNumbers([1, 2, 3, 99]);

    expect(db.calls[0]).toEqual({ name: 'sp_get_entrypass_by_ids', params: [[1, 2, 3, 99], null] });
    expect(result.requested).toBe(4);
    expect(result.sent).toBe(2);
    expect(result.failed.map((f) => [f.entryId, f.reason])).toEqual([
      [99, 'Not an active registration with a token number'],
      [3, 'Invalid mobile number'],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://sms.test/api/smsapi');
    expect(JSON.parse(String(init.body))).toEqual({
      api_key: 'key123',
      senderid: '8809600000000',
      number: '8801711111111',
      message: 'Dear Shah Mohammad Abdul Aziz, your registration completed. You token # is 95-0001, counter no #1',
    });
  });

  it('treats a non-202 gateway answer or a network error as a failure', async () => {
    vi.stubGlobal('fetch', gateway(1007));
    const { service } = setup();
    const result = await service.sendTokenNumbers([1]);
    expect(result.sent).toBe(0);
    expect(result.failed[0]).toMatchObject({ entryId: 1, reason: 'Bad' });

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    expect((await service.sendTokenNumbers([1])).failed[0].reason).toBe('SMS gateway unreachable');
  });

  it('uses the configured counter number', async () => {
    const fetchMock = gateway(202);
    vi.stubGlobal('fetch', fetchMock);
    const { service } = setup({ ...SMS_ENV, SMS_COUNTER_NO: '3' });
    await service.sendTokenNumbers([1, 2]);
    const [, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]; // entry 2
    expect(JSON.parse(String(init.body)).message).toBe('Dear M2, your registration completed. You token # is 95-0007, counter no #3');
  });

  it('logs every SMS in T_SMSLog and counts only accepted ones in TotalSMSSent', async () => {
    vi.stubGlobal('fetch', gateway(202));
    const { db, service } = setup();
    await service.sendTokenNumbers([1]);
    const calls = (name: string) => db.calls.filter((c) => c.name === name).map((c) => c.params);
    expect(calls('sp_insert_sms_request')[0]).toEqual([
      'TOKEN',
      '01711111111',
      'Dear Shah Mohammad Abdul Aziz, your registration completed. You token # is 95-0001, counter no #1',
    ]);
    expect(calls('sp_update_sms_response')[0].slice(0, 2)).toEqual(['1', 'OK']);
    expect(calls('sp_increment_sms_sent')).toEqual([[1], [2]]); // entry 3 has an invalid mobile: never sent, never counted

    vi.stubGlobal('fetch', gateway(1007));
    const second = setup();
    await second.service.sendTokenNumbers([1]);
    expect(second.db.calls.filter((c) => c.name === 'sp_update_sms_response')[0].params.slice(0, 2)).toEqual(['1', 'FAIL']);
    expect(second.db.called('sp_increment_sms_sent')).toBe(false);
  });

  it('sends the registration SMS ("Dear <name>, your registration completed.") and counts it', async () => {
    const fetchMock = gateway(202);
    vi.stubGlobal('fetch', fetchMock);
    const { db, service } = setup();
    const status = await service.sendRegistrationNotice({ entryId: 9, memberName: ' Shah Mohammad Abdul Aziz ', mobileNo: '01711111111' });
    expect(status).toBe('sent');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).message).toBe('Dear Shah Mohammad Abdul Aziz, your registration completed.');
    expect(db.calls.find((c) => c.name === 'sp_insert_sms_request')?.params[0]).toBe('REG');
    expect(db.calls.find((c) => c.name === 'sp_increment_sms_sent')?.params).toEqual([9]);
  });

  it('reports a failed registration SMS without throwing, and skips it when SMS is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    await expect(setup().service.sendRegistrationNotice({ entryId: 9, memberName: 'A', mobileNo: '01711111111' })).resolves.toBe('failed');
    const broken = setup();
    broken.db.on('sp_insert_sms_request', () => {
      throw new Error('db down');
    });
    await expect(broken.service.sendRegistrationNotice({ entryId: 9, memberName: 'A', mobileNo: '01711111111' })).resolves.toBe('failed');
    await expect(setup({}).service.sendRegistrationNotice({ entryId: 9, memberName: 'A', mobileNo: '01711111111' })).resolves.toBe('skipped');
  });

  it('refuses to send when SMS is not configured', async () => {
    const { service } = setup({});
    await expect(service.sendTokenNumbers([1])).rejects.toMatchObject({ status: 503 });
  });
});
