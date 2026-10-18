import { resolve } from 'node:path';

export const APP_CONFIG = Symbol('APP_CONFIG');

export type SameSite = 'lax' | 'strict' | 'none';

export interface RoleTypeConfig {
  typeNames: string[];
  typeId: number;
}

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  frontendUrl: string;
  db: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    schema: string;
    ssl: boolean;
    poolMax: number;
  };
  auth: {
    secret: string;
    sessionTtlHours: number;
    cookieName: string;
    cookieSecure: boolean;
    cookieSameSite: SameSite;
  };
  roles: {
    /**
     * T_UserType rows per application role: names are matched
     * case-insensitively at login, ids are passed to sp_insert_user.
     */
    admin: RoleTypeConfig;
    register: RoleTypeConfig;
    viewer: RoleTypeConfig;
  };
  uploads: {
    dir: string;
    maxBytes: number;
  };
  event: {
    registrationFee: number;
    driverFee: number;
  };
  sms: {
    /** bulksmsbd.net endpoint. */
    apiUrl: string;
    /** Empty = SMS sending is disabled (the API answers 503). */
    apiKey: string;
    senderId: string;
    /** The token number is appended: "<message>: 0043". */
    message: string;
  };
}

class ConfigError extends Error {}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new ConfigError(`Missing required environment variable ${key}`);
  return value;
}

function int(env: NodeJS.ProcessEnv, key: string, fallback: number, min = 0): number {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new ConfigError(`${key} must be an integer >= ${min}`);
  }
  return value;
}

function bool(env: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function list(env: NodeJS.ProcessEnv, key: string, fallback: string[]): string[] {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const isProduction = nodeEnv === 'production';

  const schema = env.DB_SCHEMA?.trim() || 'hsc95';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
    throw new ConfigError('DB_SCHEMA must be a plain lower-case identifier');
  }

  const secret = required(env, 'AUTH_SECRET');
  if (secret.length < 32) {
    throw new ConfigError('AUTH_SECRET must be at least 32 characters');
  }

  const sameSite = (env.COOKIE_SAMESITE?.trim().toLowerCase() || 'lax') as SameSite;
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new ConfigError('COOKIE_SAMESITE must be lax, strict or none');
  }
  const cookieSecure = bool(env, 'COOKIE_SECURE', isProduction);
  if (sameSite === 'none' && !cookieSecure) {
    throw new ConfigError('COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
  }

  const roles = {
    admin: { typeNames: list(env, 'ADMIN_USER_TYPE_NAMES', ['admin']), typeId: int(env, 'ADMIN_USER_TYPE_ID', 1, 0) },
    register: { typeNames: list(env, 'REGISTER_USER_TYPE_NAMES', ['register']), typeId: int(env, 'REGISTER_USER_TYPE_ID', 2, 0) },
    viewer: {
      typeNames: list(env, 'VIEWER_USER_TYPE_NAMES', ['report viewer']),
      typeId: int(env, 'VIEWER_USER_TYPE_ID', 3, 0),
    },
  };
  const allNames = [...roles.admin.typeNames, ...roles.register.typeNames, ...roles.viewer.typeNames];
  if (new Set(allNames).size !== allNames.length) {
    throw new ConfigError('A user type name can belong to only one role');
  }

  return {
    nodeEnv,
    isProduction,
    port: int(env, 'PORT', 4000, 1),
    frontendUrl: env.FRONTEND_URL?.trim() || 'http://localhost:3000',
    db: {
      host: required(env, 'DB_HOST'),
      port: int(env, 'DB_PORT', 5432, 1),
      database: required(env, 'DB_NAME'),
      user: required(env, 'DB_USER'),
      password: env.DB_PASSWORD ?? '',
      schema,
      ssl: bool(env, 'DB_SSL', false),
      poolMax: int(env, 'DB_POOL_MAX', 10, 1),
    },
    auth: {
      secret,
      sessionTtlHours: int(env, 'SESSION_TTL_HOURS', 8, 1),
      cookieName: env.SESSION_COOKIE_NAME?.trim() || 'hsc95_session',
      cookieSecure,
      cookieSameSite: sameSite,
    },
    roles,
    uploads: {
      dir: resolve(env.UPLOAD_DIR?.trim() || './storage'),
      maxBytes: int(env, 'PHOTO_MAX_BYTES', 2 * 1024 * 1024, 1024),
    },
    event: {
      registrationFee: int(env, 'EVENT_REGISTRATION_FEE', 1500, 0),
      driverFee: int(env, 'EVENT_DRIVER_FEE', 500, 0),
    },
    sms: {
      apiUrl: env.SMS_API_URL?.trim() || 'http://bulksmsbd.net/api/smsapi',
      apiKey: env.SMS_API_KEY?.trim() ?? '',
      senderId: env.SMS_API_SENDER_KEY?.trim() ?? '',
      message: env.SMS_API_MESSAGE?.trim() || 'Your registration is completed and your token number is',
    },
  };
}
