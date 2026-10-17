/**
 * Create a staff user with hsc95.sp_insert_user (e.g. the first Admin).
 *
 *   npm run create-user -- --name "Full Name" --login admin --email a@b.com --role admin [--contact 017XXXXXXXX]
 *
 * The password is asked for interactively (hidden), or taken from the
 * CREATE_USER_PASSWORD environment variable. It is never a command-line
 * argument, so it does not end up in shell history.
 */
import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import pg from 'pg';
import { loadConfig } from '../config/app-config.js';
import { buildDbFunctions } from '../database/db-functions.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';

if (existsSync('.env')) process.loadEnvFile('.env');

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error('No terminal for the password prompt; set CREATE_USER_PASSWORD instead.'));
      return;
    }
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        process.exit(130);
      } else if (ch === '\u007f' || ch === '\b') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      login: { type: 'string' },
      email: { type: 'string' },
      contact: { type: 'string' },
      role: { type: 'string', default: 'admin' },
    },
  });

  let password = process.env.CREATE_USER_PASSWORD ?? '';
  if (!password) {
    password = await readHidden('Password: ');
    if (password !== (await readHidden('Repeat password: '))) throw new Error('Passwords do not match');
  }

  const dto = plainToInstance(CreateUserDto, {
    fullName: values.name,
    loginName: values.login,
    email: values.email,
    contactNumber: values.contact,
    role: values.role,
    password,
  });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    throw new Error(errors.flatMap((e) => Object.values(e.constraints ?? {})).join('\n'));
  }

  const config = loadConfig();
  const fn = buildDbFunctions(config.db.schema);
  const client = new pg.Client({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query<{ Exists: boolean }>(fn.checkLoginExists.sql, [dto.loginName]);
    if (exists.rows[0]?.Exists) throw new Error(`Login name "${dto.loginName}" is already taken`);
    const created = await client.query<{ UserId: number }>(fn.insertUser.sql, [
      dto.fullName,
      dto.loginName,
      dto.password,
      dto.email,
      dto.contactNumber ?? null,
      config.roles[dto.role].typeId,
      1,
    ]);
    await client.query('COMMIT');
    console.log(`Created ${dto.role} user "${dto.loginName}" with UserId ${created.rows[0].UserId}.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`Could not create the user: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
