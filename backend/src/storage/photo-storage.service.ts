import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { mimeForExtension, type PhotoExtension } from './photo-validation.js';

/**
 * Storage keys look like "photos/<name>.<ext>"; this is what goes into
 * T_Photos.PhotoPath. New photos are named after the token ("95-0043");
 * photos saved before that keep their random UUID names.
 */
const NAME = '(?:\\d{2}-\\d{4,5}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
const KEY_PATTERN = new RegExp(`^photos/${NAME}\\.(jpg|png|webp)$`);
const FILE_PATTERN = new RegExp(`^${NAME}\\.(jpg|png|webp)$`);
const TOKEN_NAME_PATTERN = /^\d{2}-\d{4,5}$/;

export interface StoredPhoto {
  body: Buffer;
  contentType: string;
}

/**
 * Local-disk photo storage, kept outside the source tree and never served
 * statically. Swap this class for an object-storage implementation with
 * the same methods to move to S3/R2/etc.
 */
@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger(PhotoStorageService.name);
  private readonly root: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.root = config.uploads.dir;
  }

  /**
   * Save validated bytes; returns the storage key. With a token name
   * ("95-0043") the file is photos/95-0043.<ext> (replacing a leftover file of
   * that name); without one it gets a random name.
   */
  async save(body: Buffer, ext: PhotoExtension, tokenName?: string): Promise<string> {
    if (tokenName !== undefined && !TOKEN_NAME_PATTERN.test(tokenName)) throw new Error('Invalid photo name');
    const key = `photos/${tokenName ?? randomUUID()}.${ext}`;
    const path = this.pathFor(key);
    await mkdir(join(this.root, 'photos'), { recursive: true });
    await writeFile(path, body, { flag: tokenName ? 'w' : 'wx', mode: 0o640 });
    return key;
  }

  async remove(key: string): Promise<void> {
    const path = this.pathForOrNull(key);
    if (!path) return;
    await unlink(path).catch((error: unknown) => {
      this.logger.warn(`Could not remove ${key}: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  /** Read a stored photo by key. Returns null for unknown or foreign paths. */
  async read(key: string): Promise<StoredPhoto | null> {
    const path = this.pathForOrNull(key);
    if (!path) return null;
    try {
      const body = await readFile(path);
      const ext = key.slice(key.lastIndexOf('.') + 1) as PhotoExtension;
      return { body, contentType: mimeForExtension(ext) };
    } catch {
      return null;
    }
  }

  /** True if the value stored in PhotoPath is a key managed by this service. */
  isManagedKey(value: string | null | undefined): value is string {
    return typeof value === 'string' && KEY_PATTERN.test(value);
  }

  /** "photos/95-0043.jpg" -> "95-0043.jpg" (used in admin photo URLs). */
  fileNameOf(key: string): string {
    return key.slice('photos/'.length);
  }

  /** Validate a file name from a URL and turn it back into a key. */
  keyFromFileName(fileName: string): string | null {
    return FILE_PATTERN.test(fileName) ? `photos/${fileName}` : null;
  }

  private pathForOrNull(key: string): string | null {
    return KEY_PATTERN.test(key) ? this.pathFor(key) : null;
  }

  private pathFor(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new Error('Invalid storage key');
    const path = resolve(this.root, key);
    // Defence in depth against path traversal (the pattern already forbids it).
    if (!path.startsWith(resolve(this.root) + sep)) throw new Error('Invalid storage key');
    return path;
  }
}
