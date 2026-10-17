import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { DatabaseService } from '../database/database.service.js';
import type { DuplicateCheckRow } from '../database/db-rows.js';
import { PhotoStorageService } from '../storage/photo-storage.service.js';
import { declaredTypeMatches, detectImageType } from '../storage/photo-validation.js';
import type { CreateRegistrationDto } from './dto/create-registration.dto.js';

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface RegistrationResult {
  entryId: number;
  formNo: number;
  amountPaid: number;
}

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: PhotoStorageService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  eventFees() {
    return { registrationFee: this.config.event.registrationFee, driverFee: this.config.event.driverFee };
  }

  /** Business rule: registration fee, plus the driver fee when a driver is included. */
  calculateAmount(includeDriver: boolean): number {
    const { registrationFee, driverFee } = this.config.event;
    return registrationFee + (includeDriver ? driverFee : 0);
  }

  /**
   * A Register (or Admin) user enters a member's form. EntryBy is the
   * signed-in user's id, never a client value. The form number is the one
   * printed on the paper form, or the next free number when left empty.
   * All database calls run in one transaction; on any failure the stored
   * photo file is deleted too, so nothing is left orphaned.
   */
  async register(
    dto: CreateRegistrationDto,
    photo: UploadedPhoto | undefined,
    enteredBy: number,
  ): Promise<RegistrationResult> {
    if (!photo) throw new BadRequestException('A member photo is required');
    const ext = detectImageType(photo.buffer);
    if (!ext || !declaredTypeMatches(photo.mimetype, ext)) {
      throw new BadRequestException('The photo must be a JPEG, PNG or WebP image');
    }

    const amount = this.calculateAmount(dto.includeDriver);
    const fn = this.db.fn;
    const photoKey = await this.storage.save(photo.buffer, ext);

    try {
      return await this.db.transaction(async (client) => {
        // Takes the registration advisory lock: serialises concurrent entries.
        const dup = await this.db.callOne<DuplicateCheckRow>(
          fn.checkRegistrationDuplicate,
          [dto.mobileNo, dto.formNo ?? null],
          client,
        );
        if (!dup) throw new Error('sp_check_registration_duplicate returned no row');
        if (dup.FormNoExists) throw new ConflictException('This form number is already registered');
        if (dup.MobileNoExists) throw new ConflictException('A registration with this mobile number already exists');

        let formNo = dto.formNo ?? null;
        if (formNo === null) {
          const next = await this.db.callOne<{ FormNo: string }>(fn.getNextFormNo, [], client);
          if (!next) throw new Error('sp_get_next_form_no returned no row');
          formNo = Number(next.FormNo);
        }

        const entry = await this.db.callOne<{ EntryId: number }>(
          fn.insertEventForm,
          [
            formNo,
            dto.memberName,
            dto.collegeName ?? null,
            dto.thanaName ?? null,
            dto.zilaName ?? null,
            dto.workType ?? null,
            dto.bloodGroup ?? null,
            dto.workPlaceAddress ?? null,
            dto.mobileNo,
            dto.facebookId ?? null,
            dto.tShirtSize,
            enteredBy, // EntryBy: the signed-in Register/Admin user
            null, // PassCode: issued later by the organiser (see sp_SendToken_sms)
            dto.includeDriver ? 'Y' : 'N',
            amount,
            'N',
            1,
          ],
          client,
        );
        if (!entry) throw new Error('sp_insert_event_form returned no id');

        await this.db.callOne(fn.insertEventFormPhoto, [entry.EntryId, photoKey, 1], client);

        return { entryId: entry.EntryId, formNo, amountPaid: amount };
      });
    } catch (error) {
      await this.storage.remove(photoKey);
      throw error;
    }
  }
}
