----------------------------------------------------------------------
-- 002_fix_existing_functions.sql            *** PROPOSED - REVIEW FIRST ***
--
-- These statements REPLACE functions that come from db.txt. They are kept
-- separate on purpose and are NOT applied automatically. Review with the
-- database owner, then run manually.
--
-- Each fix keeps the original function name, parameters and return
-- signature, so nothing else that calls these functions has to change.
----------------------------------------------------------------------


----------------------------------------------------------------------
-- FIX A (BLOCKING): sp_user_login
--
-- Problem: the function declares  "ContactNumber" numeric(11,0)  but
-- selects T_Users."ContactNumber", which is character varying(11).
-- PL/pgSQL RETURN QUERY requires matching column types, so every
-- successful login raises:
--   ERROR: structure of query does not match function result type
--   DETAIL: Returned type character varying(11) does not match expected
--           type numeric in column 4.
-- Result: nobody can log in with db.txt as written.
--
-- Smallest fix: convert the value explicitly. Non-numeric/empty contact
-- numbers become NULL instead of failing. (Leading zeros are lost in a
-- numeric; the web app does not use this column - it reads the contact
-- number through sp_get_session_user, which returns varchar.)
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_user_login(
    p_loginname character varying(100),
    p_password character varying(128)
)
RETURNS TABLE (
    "UserId" integer,
    "FullName" character varying(200),
    "LoginName" character varying(100),
    "ContactNumber" numeric(11,0),
    "EmailAddress" character varying(250),
    "UserTypeName" character varying(15)
) AS $$
DECLARE
    v_userid integer;
    v_loginname character varying(100);
BEGIN
    SELECT u."UserId", u."LoginName"
    INTO v_userid, v_loginname
    FROM hsc95."T_Users" u
    WHERE u."LoginName" = p_loginname
      AND u."Password" = crypt(p_password, u."Password");

    IF FOUND THEN
        INSERT INTO hsc95."T_Events" ("EventType", "EventText")
        VALUES (
            'Login',
            'User ' || v_loginname || ' (ID: ' || v_userid || ') successfully logged in.'
        );
    END IF;

    RETURN QUERY
    SELECT
        u."UserId",
        u."FullName",
        u."LoginName",
        CASE WHEN u."ContactNumber" ~ '^[0-9]{1,11}$'
             THEN u."ContactNumber"::numeric(11,0)
        END,
        u."Email" AS "EmailAddress",
        t."UserTypeName"
    FROM hsc95."T_Users" u
    INNER JOIN hsc95."T_UserType" t ON u."UserType" = t."UserTypeId"
    WHERE u."UserId" = v_userid;
END;
$$ LANGUAGE plpgsql;


----------------------------------------------------------------------
-- FIX B: sp_prepare_sms
--
-- Problem: "MobileNo" is both an output column and an unqualified table
-- column reference -> ERROR: column reference "MobileNo" is ambiguous.
-- Fix: qualify with a table alias. (Not used by the web app.)
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_prepare_sms()
RETURNS TABLE (
    "SMS" text,
    "MobileNo" character varying(11)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ('Dear ' || f."MemberName" || ', Your registration is complete. Your token no will be send very soon. Thank you for participate. HSC 95 Society (30 Years celebration)')::text AS "SMS",
        f."MobileNo"
    FROM hsc95."T_EventForm" f
    ORDER BY f."EntryId" ASC;
END;
$$ LANGUAGE plpgsql;


----------------------------------------------------------------------
-- FIX C: sp_SendToken_sms
--
-- Problems: (1) same ambiguous "MobileNo" as FIX B; (2) the PassCode is
-- inside the string literal ('... is "||"PassCode"||". ...'), so the SMS
-- literally reads:  Your Token Number is "||"PassCode"||".
-- Fix: concatenate the column. (Not used by the web app.)
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_SendToken_sms()
RETURNS TABLE (
    "SMS" text,
    "MobileNo" character varying(11)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ('Dear ' || f."MemberName" || ', Your Token Number is ' || COALESCE(f."PassCode", '') || '. HSC 95 Society (30 Years celebration)')::text AS "SMS",
        f."MobileNo"
    FROM hsc95."T_EventForm" f
    ORDER BY f."EntryId" ASC;
END;
$$ LANGUAGE plpgsql;
-- NOTE: db.txt creates the name unquoted, so PostgreSQL stores it as
-- hsc95.sp_sendtoken_sms. The unquoted name above folds the same way and
-- therefore replaces the existing function.
