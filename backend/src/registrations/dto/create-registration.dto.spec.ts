import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRegistrationDto, normalizeMobile } from './create-registration.dto.js';

const valid = {
  memberName: '  রহিম   উদ্দিন ',
  mobileNo: '01711111111',
  tShirtSize: 'XL',
  gender: 'M',
  includeDriver: 'false',
};

async function errorsFor(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateRegistrationDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, fields: errors.map((e) => e.property) };
}

describe('CreateRegistrationDto', () => {
  it('accepts a valid registration and sanitises text', async () => {
    const { dto, fields } = await errorsFor(valid);
    expect(fields).toEqual([]);
    expect(dto.memberName).toBe('রহিম উদ্দিন');
    expect(dto.includeDriver).toBe(false);
    expect(dto.formNo).toBeUndefined();
  });

  it('requires name, mobile, t-shirt size and gender', async () => {
    const { fields } = await errorsFor({});
    expect(fields).toEqual(expect.arrayContaining(['memberName', 'mobileNo', 'tShirtSize', 'gender']));
  });

  it('only accepts gender M or F', async () => {
    expect((await errorsFor({ ...valid, gender: 'F' })).fields).toEqual([]);
    expect((await errorsFor({ ...valid, gender: 'Male' })).fields).toContain('gender');
  });

  it('accepts an optional paper form number within numeric(5,0)', async () => {
    const ok = await errorsFor({ ...valid, formNo: '0123' });
    expect(ok.fields).toEqual([]);
    expect(ok.dto.formNo).toBe(123);
    expect((await errorsFor({ ...valid, formNo: '' })).dto.formNo).toBeUndefined();
    expect((await errorsFor({ ...valid, formNo: '100000' })).fields).toContain('formNo');
    expect((await errorsFor({ ...valid, formNo: '12a' })).fields).toContain('formNo');
  });

  it('only allows the supported T-shirt sizes and blood groups', async () => {
    expect((await errorsFor({ ...valid, tShirtSize: 'S' })).fields).toContain('tShirtSize');
    expect((await errorsFor({ ...valid, bloodGroup: 'Z+' })).fields).toContain('bloodGroup');
    expect((await errorsFor({ ...valid, bloodGroup: 'AB-' })).fields).toEqual([]);
  });

  it('validates Bangladeshi mobile numbers', async () => {
    expect((await errorsFor({ ...valid, mobileNo: '0171111111' })).fields).toContain('mobileNo');
    expect((await errorsFor({ ...valid, mobileNo: '01211111111' })).fields).toContain('mobileNo');
    expect((await errorsFor({ ...valid, mobileNo: '+880 1711-111111' })).fields).toEqual([]);
  });

  it('normalises Bengali digits and prefixes', () => {
    expect(normalizeMobile('০১৭১১-১১১১১১')).toBe('01711111111');
    expect(normalizeMobile('8801711111111')).toBe('01711111111');
  });

  it('rejects client-supplied privileged fields', async () => {
    expect((await errorsFor({ ...valid, entryBy: 1 })).fields).toContain('entryBy');
    expect((await errorsFor({ ...valid, amountPaid: 0 })).fields).toContain('amountPaid');
  });

  it('turns empty optional fields into undefined', async () => {
    const { dto, fields } = await errorsFor({ ...valid, collegeName: '   ', bloodGroup: '' });
    expect(fields).toEqual([]);
    expect(dto.collegeName).toBeUndefined();
    expect(dto.bloodGroup).toBeUndefined();
  });
});
