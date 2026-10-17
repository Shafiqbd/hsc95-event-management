import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Authenticated, CurrentUser } from '../auth/auth.decorators.js';
import { entryScope, type SessionUser } from '../auth/auth.types.js';
import { TokensService } from './tokens.service.js';

const MAX_SELECTED = 1000;

export function parseEntryIds(raw: string | undefined): number[] | null {
  if (raw === undefined || raw.trim() === '') return null;
  const parts = raw.split(',');
  if (parts.length > MAX_SELECTED) throw new BadRequestException(`At most ${MAX_SELECTED} ids can be printed at once`);
  const ids = parts.map((part) => Number(part.trim()));
  if (ids.some((id) => !Number.isInteger(id) || id < 1 || id > 2_147_483_647)) {
    throw new BadRequestException('ids must be a comma-separated list of entry ids');
  }
  return [...new Set(ids)];
}

@Controller('admin/tokens')
@Authenticated('admin', 'register', 'viewer')
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  /**
   * Complete print dataset, never just one page of the table.
   * Without ids: all eligible tokens (sp_prepare_entrypass), or for a
   * Register user all eligible tokens they entered.
   * With ?ids=1,2,3: only those registrations (sp_get_entrypass_by_ids),
   * again limited to a Register user's own entries.
   */
  @Get('print-data')
  async printData(@CurrentUser() user: SessionUser, @Query('ids') ids?: string) {
    const selected = parseEntryIds(ids);
    const scope = entryScope(user);
    if (!selected && scope === null) return { data: await this.tokens.all() };
    return { data: await this.tokens.byIds(selected, scope) };
  }
}
