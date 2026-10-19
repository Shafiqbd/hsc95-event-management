import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { DataSource } from 'typeorm';
import { tokenLabel } from '../common/token-number.js';
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
    private readonly dataSource: DataSource,
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
    // The photo is optional; when one is sent it must be a real JPEG/PNG/WebP.
    let ext: ReturnType<typeof detectImageType> = null;
    if (photo) {
      ext = detectImageType(photo.buffer);
      if (!ext || !declaredTypeMatches(photo.mimetype, ext)) {
        throw new BadRequestException('The photo must be a JPEG, PNG or WebP image');
      }
    }

    const amount = this.calculateAmount(dto.includeDriver);
    let photoKey: string | null = null;

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Takes the registration advisory lock: serialises concurrent entries.
        // Only the form number must be unique; one mobile may register several forms.
        const [dup]: DuplicateCheckRow[] = await manager.query(
          `SELECT * FROM sp_check_registration_duplicate($1::varchar, $2::numeric);`,
          [dto.mobileNo, dto.formNo ?? null],
        );
        if (!dup) throw new Error('sp_check_registration_duplicate returned no row');
        if (dup.FormNoExists) throw new ConflictException('This form number is already registered');

        let formNo = dto.formNo ?? null;
        if (formNo === null) {
          const [next]: { FormNo: string }[] = await manager.query(`SELECT sp_get_next_form_no() AS "FormNo";`);
          if (!next) throw new Error('sp_get_next_form_no returned no row');
          formNo = Number(next.FormNo);
        }

        const insertForm = `
          SELECT sp_insert_event_form(
            $1::numeric, $2::text, $3::text, $4::text, $5::text, $6::text,
            $7::varchar, $8::text, $9::varchar, $10::text, $11::varchar,
            $12::numeric, $13::varchar, $14::char, $15::numeric, $16::char, $17::numeric
          ) AS "EntryId";
        `;

        const [entry]: { EntryId: number }[] = await manager.query(
          insertForm,
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
        );
        if (!entry) throw new Error('sp_insert_event_form returned no id');

        // sp_insert_event_form has no gender parameter; set it in the same transaction.
        await manager.query(`SELECT sp_set_event_form_gender($1::integer, $2::varchar) AS "Updated";`, [
          entry.EntryId,
          dto.gender,
        ]);

        // Saved now that the token number is known: photos/95-0043.jpg.
        if (photo && ext) {
          photoKey = await this.storage.save(photo.buffer, ext, tokenLabel(formNo));
          await manager.query(`SELECT sp_insert_event_form_photo($1::numeric, $2::text, $3::numeric) AS "PhotoId";`, [
            entry.EntryId,
            photoKey,
            1,
          ]);
        }

        return { entryId: entry.EntryId, formNo, amountPaid: amount };
      });
    } catch (error) {
      if (photoKey) await this.storage.remove(photoKey);
      throw error;
    }
  }
}
