import type { DataSource } from 'typeorm';
import { FakeDataSource, testConfig } from '../../test/helpers.js';
import { SmsService, tokenNumber } from './sms.service.js';

const SMS_ENV = {
  SMS_API_URL: 'http://sms.test/api/smsapi',
  SMS_API_KEY: 'key123',
  SMS_API_SENDER_KEY: '8809600000000',
  SMS_API_MESSAGE: 'Your registration is completed and your token number is',
};

const row = (entryId: number, formNo: string | null, mobileNo: string | null) => ({
  EntryId: entryId,
  MemberName: `M${entryId}`,
  FormNo: formNo,
  MobileNo: mobileNo,
  PhotoPath: null,
  CollegeName: null,
  TShirtSize: 'L',
  IncludeDriver: 'N',
});

function setup(env: Record<string, string> = SMS_ENV) {
  const db = new FakeDataSource().on('sp_get_entrypass_by_ids', () => [
    row(1, '43', '01711111111'),
    row(2, '7', '01711111111'), // same mobile, different form: still gets its own SMS
    row(3, '8', '12345'),
  ]);
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
      message: 'Your registration is completed and your token number is: 0043',
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

  it('refuses to send when SMS is not configured', async () => {
    const { service } = setup({});
    await expect(service.sendTokenNumbers([1])).rejects.toMatchObject({ status: 503 });
  });
});
