/**
 * Create a staff user with sp_insert_user (e.g. the first Admin).
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
import { DataSource } from 'typeorm';
import { loadConfig } from '../config/app-config.js';
import { buildDataSourceOptions } from '../database/data-source-options.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { UsersService } from '../users/users.service.js';

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
  const dataSource = await new DataSource({ ...buildDataSourceOptions(config), poolSize: 1 }).initialize();
  try {
    // Same transaction + login-name check as the Users page.
    const { userId } = await new UsersService(dataSource, config).create(dto);
    console.log(`Created ${dto.role} user "${dto.loginName}" with UserId ${userId}.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(`Could not create the user: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
