/**
 * The ONLY place SQL text lives. Every statement is a call to a
 * PostgreSQL function in the configured schema; the backend never reads
 * or writes application tables directly.
 *
 * "source" says where the function is defined:
 *   db.txt  - supplied specification
 *   001     - database/migrations/001_app_support_functions.sql (additive)
 */

export interface DbFunction {
  name: string;
  source: 'db.txt' | '001';
  sql: string;
}

export function buildDbFunctions(schema: string) {
  const fn = (name: string, source: DbFunction['source'], sql: string): DbFunction => ({
    name: `${schema}.${name}`,
    source,
    sql,
  });

  return {
    // ---- db.txt ----------------------------------------------------------
    userLogin: fn(
      'sp_user_login',
      'db.txt',
      `SELECT * FROM ${schema}.sp_user_login($1::varchar, $2::varchar)`,
    ),
    insertUser: fn(
      'sp_insert_user',
      'db.txt',
      `SELECT ${schema}.sp_insert_user($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::numeric, $7::numeric) AS "UserId"`,
    ),
    getUserList: fn('sp_get_user_list', 'db.txt', `SELECT * FROM ${schema}.sp_get_user_list()`),
    insertEventForm: fn(
      'sp_insert_event_form',
      'db.txt',
      `SELECT ${schema}.sp_insert_event_form(
        $1::numeric, $2::text, $3::text, $4::text, $5::text, $6::text,
        $7::varchar, $8::text, $9::varchar, $10::text, $11::varchar,
        $12::numeric, $13::varchar, $14::char, $15::numeric, $16::char, $17::numeric
      ) AS "EntryId"`,
    ),
    insertEventFormPhoto: fn(
      'sp_insert_event_form_photo',
      'db.txt',
      `SELECT ${schema}.sp_insert_event_form_photo($1::numeric, $2::text, $3::numeric) AS "PhotoId"`,
    ),
    prepareEntryPass: fn(
      'sp_prepare_entrypass',
      'db.txt',
      `SELECT * FROM ${schema}.sp_prepare_entrypass()`,
    ),

    // ---- 001_app_support_functions.sql ----------------------------------
    getSessionUser: fn(
      'sp_get_session_user',
      '001',
      `SELECT * FROM ${schema}.sp_get_session_user($1::integer)`,
    ),
    checkRegistrationDuplicate: fn(
      'sp_check_registration_duplicate',
      '001',
      `SELECT * FROM ${schema}.sp_check_registration_duplicate($1::varchar, $2::numeric)`,
    ),
    checkLoginExists: fn(
      'sp_check_login_exists',
      '001',
      `SELECT ${schema}.sp_check_login_exists($1::varchar) AS "Exists"`,
    ),
    getNextFormNo: fn(
      'sp_get_next_form_no',
      '001',
      `SELECT ${schema}.sp_get_next_form_no() AS "FormNo"`,
    ),
    getRegistrationList: fn(
      'sp_get_registration_list',
      '001',
      `SELECT * FROM ${schema}.sp_get_registration_list($1::text, $2::integer, $3::integer, $4::integer)`,
    ),
    getRegistrationById: fn(
      'sp_get_registration_by_id',
      '001',
      `SELECT * FROM ${schema}.sp_get_registration_by_id($1::integer, $2::integer)`,
    ),
    getEntryPassByIds: fn(
      'sp_get_entrypass_by_ids',
      '001',
      `SELECT * FROM ${schema}.sp_get_entrypass_by_ids($1::integer[], $2::integer)`,
    ),
    getDashboardStats: fn(
      'sp_get_dashboard_stats',
      '001',
      `SELECT * FROM ${schema}.sp_get_dashboard_stats($1::integer)`,
    ),
    getTShirtSummary: fn(
      'sp_get_tshirt_summary',
      '001',
      `SELECT * FROM ${schema}.sp_get_tshirt_summary($1::integer)`,
    ),
  } as const;
}

export type DbFunctions = ReturnType<typeof buildDbFunctions>;
