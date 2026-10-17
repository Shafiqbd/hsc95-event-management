import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { JPEG, FakeDatabase, testConfig } from '../../test/helpers.js';
import type { DatabaseService } from '../database/database.service.js';
import type { PhotoStorageService } from '../storage/photo-storage.service.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { RegistrationsService } from './registrations.service.js';

function setup() {
  const db = new FakeDatabase()
    .on('sp_check_registration_duplicate', () => [{ MobileNoExists: false, FormNoExists: false }])
    .on('sp_get_next_form_no', () => [{ FormNo: '12' }])
    .on('sp_insert_event_form', () => [{ EntryId: 90 }])
    .on('sp_insert_event_form_photo', () => [{ PhotoId: '1' }]);
  const storage = {
    save: vi.fn(async () => 'photos/11111111-2222-3333-4444-555555555555.jpg'),
    remove: vi.fn(async () => undefined),
  };
  const service = new RegistrationsService(
    db as unknown as DatabaseService,
    storage as unknown as PhotoStorageService,
    testConfig(),
  );
  return { db, storage, service };
}

const dto = (over: Record<string, unknown> = {}) =>
  plainToInstance(CreateRegistrationDto, {
    memberName: 'রহিম',
    mobileNo: '01711111111',
    tShirtSize: 'L',
    includeDriver: true,
    ...over,
  });

const photo = { buffer: JPEG, mimetype: 'image/jpeg', size: JPEG.length };
const OPERATOR = 5;

describe('RegistrationsService.register', () => {
  it('saves the form in one transaction with EntryBy = the signed-in user', async () => {
    const { db, service } = setup();
    const result = await service.register(dto(), photo, OPERATOR);

    expect(result).toEqual({ entryId: 90, formNo: 12, amountPaid: 2000 });
    expect(db.calls.map((c) => c.name)).toEqual([
      'hsc95.sp_check_registration_duplicate',
      'hsc95.sp_get_next_form_no',
      'hsc95.sp_insert_event_form',
      'hsc95.sp_insert_event_form_photo',
    ]);
    expect(db.called('sp_insert_user')).toBe(false); // members get no login account
    const form = db.calls[2].params;
    expect(form[0]).toBe(12); // FormNo
    expect(form[11]).toBe(OPERATOR); // EntryBy
    expect(form[12]).toBeNull(); // PassCode not invented
    expect(form[13]).toBe('Y'); // IncludeDriver
    expect(form[14]).toBe(2000); // AmountPaid = 1500 + 500
    expect(db.committed).toBe(1);
  });

  it('uses the paper form number when given, without generating one', async () => {
    const { db, service } = setup();
    await expect(service.register(dto({ formNo: '345', includeDriver: false }), photo, OPERATOR)).resolves.toEqual({
      entryId: 90,
      formNo: 345,
      amountPaid: 1500,
    });
    expect(db.calls[0].params).toEqual(['01711111111', 345]);
    expect(db.called('sp_get_next_form_no')).toBe(false);
  });

  it.each([
    [{ MobileNoExists: true, FormNoExists: false }, /mobile number/],
    [{ MobileNoExists: false, FormNoExists: true }, /form number/],
  ])('rejects duplicates, rolls back and deletes the stored photo (%o)', async (dup, message) => {
    const { db, storage, service } = setup();
    db.on('sp_check_registration_duplicate', () => [dup]);
    const error = await service.register(dto({ formNo: 5 }), photo, OPERATOR).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as Error).message).toMatch(message);
    expect(db.called('sp_insert_event_form')).toBe(false);
    expect(db.rolledBack).toBe(1);
    expect(storage.remove).toHaveBeenCalledOnce();
  });

  it('cleans up when a later database step fails (no orphan photo file)', async () => {
    const { db, storage, service } = setup();
    db.on('sp_insert_event_form_photo', () => {
      throw new Error('boom');
    });
    await expect(service.register(dto(), photo, OPERATOR)).rejects.toThrow('boom');
    expect(db.rolledBack).toBe(1);
    expect(storage.remove).toHaveBeenCalledOnce();
  });

  it('requires a real image: missing, fake or mislabelled files are rejected before storage', async () => {
    const { storage, service } = setup();
    await expect(service.register(dto(), undefined, OPERATOR)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.register(dto(), { ...photo, buffer: Buffer.from('<?php') }, OPERATOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.register(dto(), { ...photo, mimetype: 'image/png' }, OPERATOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.save).not.toHaveBeenCalled();
  });
});
