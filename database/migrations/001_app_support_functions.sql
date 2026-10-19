----------------------------------------------------------------------
-- 001_app_support_functions.sql
--
-- ADDITIVE ONLY. Creates new read/helper functions that the web
-- application needs but db.txt does not provide. It does NOT alter any
-- table and does NOT replace any function defined in db.txt.
--
-- Safe to re-run (CREATE OR REPLACE on functions owned by this file only).
--
-- Scoping: functions with a p_entryby parameter return only the forms
-- entered by that user (T_EventForm."EntryBy") when it is NOT NULL, and
-- everything when it is NULL. The API passes the signed-in user's id for
-- Register users and NULL for Admin / Report Viewer.
-- The DROP below removes the earlier draft signature of
-- sp_check_registration_duplicate if it was ever installed.
-- See database/README.md -> "Database Gap Analysis" for the reasoning.
----------------------------------------------------------------------

DROP FUNCTION IF EXISTS hsc95.sp_check_registration_duplicate(character varying, character varying);
DROP FUNCTION IF EXISTS hsc95.sp_get_member_registration(integer);
DROP FUNCTION IF EXISTS hsc95.sp_get_registration_list(text, integer, integer);
DROP FUNCTION IF EXISTS hsc95.sp_get_registration_by_id(integer);
DROP FUNCTION IF EXISTS hsc95.sp_get_entrypass_by_ids(integer[]);
DROP FUNCTION IF EXISTS hsc95.sp_get_dashboard_stats();
DROP FUNCTION IF EXISTS hsc95.sp_get_tshirt_summary();


----------------------------------------------------------------------
-- 1. Session user lookup
--    Gap: sp_user_login does not return UserStatus, and there is no way
--    to re-validate a session (deactivated users keep access).
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_get_session_user(
    p_userid integer
)
RETURNS TABLE (
    "UserId" integer,
    "FullName" character varying(200),
    "LoginName" character varying(100),
    "Email" character varying(250),
    "ContactNumber" character varying(11),
    "UserTypeName" character varying(15),
    "UserStatus" numeric(1,0)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u."UserId",
        u."FullName",
        u."LoginName",
        u."Email",
        u."ContactNumber",
        t."UserTypeName",
        u."UserStatus"
    FROM hsc95."T_Users" u
    INNER JOIN hsc95."T_UserType" t ON u."UserType" = t."UserTypeId"
    WHERE u."UserId" = p_userid;
END;
$$ LANGUAGE plpgsql STABLE;


----------------------------------------------------------------------
-- 2. Registration serialisation + duplicate check
--    Gap: T_EventForm.MobileNo and T_EventForm.FormNo have no unique
--    constraint. Paper forms carry pre-printed form numbers that the
--    Register user types in, so both must be checked. The transaction-
--    scoped advisory lock serialises registrations until COMMIT/ROLLBACK,
--    so check-then-insert is race free.
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_check_registration_duplicate(
    p_mobileno character varying(11),
    p_formno numeric(5,0)
)
RETURNS TABLE (
    "MobileNoExists" boolean,
    "FormNoExists" boolean
) AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('hsc95.registration'));

    RETURN QUERY
    SELECT
        EXISTS (
            SELECT 1 FROM hsc95."T_EventForm" f
            WHERE f."MobileNo" = p_mobileno
              AND f."MemberStatus" = 1
        ),
        EXISTS (
            SELECT 1 FROM hsc95."T_EventForm" f
            WHERE p_formno IS NOT NULL
              AND f."FormNo" = p_formno
        );
END;
$$ LANGUAGE plpgsql;


----------------------------------------------------------------------
-- 2b. Login name availability (creating users)
--    Gap: T_Users.LoginName has no unique constraint and sp_insert_user
--    does not check. Takes its own advisory lock so two admins cannot
--    create the same login at the same time.
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_check_login_exists(
    p_loginname character varying(100)
)
RETURNS boolean AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('hsc95.users'));
    RETURN EXISTS (
        SELECT 1 FROM hsc95."T_Users" u
        WHERE lower(u."LoginName") = lower(p_loginname)
    );
END;
$$ LANGUAGE plpgsql;


----------------------------------------------------------------------
-- 3. Form number generation
--    Gap: FormNo is nullable with no sequence and no generator function.
--    Uses the same advisory lock as (2) so two registrations can never
--    receive the same number. Must be called inside a transaction.
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_get_next_form_no()
RETURNS numeric(5,0) AS $$
DECLARE
    v_formno numeric(5,0);
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('hsc95.registration'));

    SELECT COALESCE(MAX(f."FormNo"), 0) + 1
    INTO v_formno
    FROM hsc95."T_EventForm" f;

    IF v_formno > 99999 THEN
        RAISE EXCEPTION 'FormNo range numeric(5,0) exhausted';
    END IF;

    RETURN v_formno;
END;
$$ LANGUAGE plpgsql;


----------------------------------------------------------------------
-- 5. Paginated / searchable registration list
--    Gap: sp_prepare_entrypass returns only 4 columns, only rows that
--    have a photo, and has no search or paging.
--    Search matches member name (case-insensitive substring), mobile
--    number (substring) or exact form number. strpos() is used instead
--    of LIKE so user input can never act as a wildcard pattern.
----------------------------------------------------------------------

-- Result columns changed (Gender, TotalSMSSent added), which CREATE OR REPLACE cannot do in place.
DROP FUNCTION IF EXISTS hsc95.sp_get_registration_list(text, integer, integer, integer);

CREATE OR REPLACE FUNCTION hsc95.sp_get_registration_list(
    p_search text,
    p_limit integer,
    p_offset integer,
    p_entryby integer DEFAULT NULL
)
RETURNS TABLE (
    "EntryId" integer,
    "FormNo" numeric(5,0),
    "MemberName" text,
    "CollegeName" text,
    "ThanaName" text,
    "ZilaName" text,
    "WorkType" text,
    "BloodGroup" character varying(3),
    "WorkPlaceAddress" text,
    "MobileNo" character varying(11),
    "FacebookId" text,
    "TShirtSize" character varying(3),
    "IncludeDriver" character(1),
    "AmountPaid" numeric(7,2),
    "EntryDate" timestamp without time zone,
    "PassCode" character varying(8),
    "MemberLock" character(1),
    "MemberStatus" numeric(1,0),
    "PhotoPath" text,
    "Gender" character varying(5),
    "TotalSMSSent" numeric,
    "TotalCount" bigint
) AS $$
DECLARE
    v_search text := NULLIF(btrim(COALESCE(p_search, '')), '');
    v_limit  integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 500);
    v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
    RETURN QUERY
    SELECT
        f."EntryId", f."FormNo", f."MemberName", f."CollegeName",
        f."ThanaName", f."ZilaName", f."WorkType", f."BloodGroup",
        f."WorkPlaceAddress", f."MobileNo", f."FacebookId", f."TShirtSize",
        f."IncludeDriver", f."AmountPaid", f."EntryDate", f."PassCode",
        f."MemberLock", f."MemberStatus", ph."PhotoPath", f."Gender",
        COALESCE(f."TotalSMSSent", 0),
        COUNT(*) OVER () AS "TotalCount"
    FROM hsc95."T_EventForm" f
    LEFT JOIN LATERAL (
        SELECT p."PhotoPath"
        FROM hsc95."T_Photos" p
        WHERE p."EntryId" = f."EntryId" AND p."PhotoStatus" = 1
        ORDER BY p."PhotoId" DESC
        LIMIT 1
    ) ph ON TRUE
    WHERE (p_entryby IS NULL OR f."EntryBy" = p_entryby)
      AND (v_search IS NULL
           OR strpos(lower(f."MemberName"), lower(v_search)) > 0
           OR strpos(COALESCE(f."MobileNo", ''), v_search) > 0
           OR f."FormNo"::text = v_search)
    ORDER BY f."EntryId" DESC
    LIMIT v_limit OFFSET v_offset;
END;
$$ LANGUAGE plpgsql STABLE;


----------------------------------------------------------------------
-- 6. Single registration by EntryId (detail view)
----------------------------------------------------------------------

-- Result columns changed (Gender, TotalSMSSent added), which CREATE OR REPLACE cannot do in place.
DROP FUNCTION IF EXISTS hsc95.sp_get_registration_by_id(integer, integer);

CREATE OR REPLACE FUNCTION hsc95.sp_get_registration_by_id(
    p_entryid integer,
    p_entryby integer DEFAULT NULL
)
RETURNS TABLE (
    "EntryId" integer,
    "FormNo" numeric(5,0),
    "MemberName" text,
    "CollegeName" text,
    "ThanaName" text,
    "ZilaName" text,
    "WorkType" text,
    "BloodGroup" character varying(3),
    "WorkPlaceAddress" text,
    "MobileNo" character varying(11),
    "FacebookId" text,
    "TShirtSize" character varying(3),
    "IncludeDriver" character(1),
    "AmountPaid" numeric(7,2),
    "EntryDate" timestamp without time zone,
    "PassCode" character varying(8),
    "MemberLock" character(1),
    "MemberStatus" numeric(1,0),
    "PhotoPath" text,
    "Gender" character varying(5),
    "TotalSMSSent" numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f."EntryId", f."FormNo", f."MemberName", f."CollegeName",
        f."ThanaName", f."ZilaName", f."WorkType", f."BloodGroup",
        f."WorkPlaceAddress", f."MobileNo", f."FacebookId", f."TShirtSize",
        f."IncludeDriver", f."AmountPaid", f."EntryDate", f."PassCode",
        f."MemberLock", f."MemberStatus", ph."PhotoPath", f."Gender",
        COALESCE(f."TotalSMSSent", 0)
    FROM hsc95."T_EventForm" f
    LEFT JOIN LATERAL (
        SELECT p."PhotoPath"
        FROM hsc95."T_Photos" p
        WHERE p."EntryId" = f."EntryId" AND p."PhotoStatus" = 1
        ORDER BY p."PhotoId" DESC
        LIMIT 1
    ) ph ON TRUE
    WHERE f."EntryId" = p_entryid
      AND (p_entryby IS NULL OR f."EntryBy" = p_entryby);
END;
$$ LANGUAGE plpgsql STABLE;


----------------------------------------------------------------------
-- 7. Entry-pass data for selected registrations
--    Gap: sp_prepare_entrypass() has no filter and does not return
--    EntryId, so a selection cannot be printed. Eligible = active
--    registration (MemberStatus = 1) with a form number; the photo is
--    optional (PhotoPath is NULL when there is no active photo).
--    p_entryids NULL = every eligible form (used for "print all"; for a
--    Register user limited to their own entries). Also returns college,
--    T-shirt size and driver flag for the PDF token.
----------------------------------------------------------------------

-- The result columns changed, which CREATE OR REPLACE cannot do in place.
DROP FUNCTION IF EXISTS hsc95.sp_get_entrypass_by_ids(integer[], integer);

CREATE OR REPLACE FUNCTION hsc95.sp_get_entrypass_by_ids(
    p_entryids integer[],
    p_entryby integer DEFAULT NULL
)
RETURNS TABLE (
    "EntryId" integer,
    "MemberName" text,
    "FormNo" numeric(5,0),
    "MobileNo" character varying(11),
    "PhotoPath" text,
    "CollegeName" text,
    "TShirtSize" character varying(3),
    "IncludeDriver" character(1)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f."EntryId",
        f."MemberName",
        f."FormNo",
        f."MobileNo",
        ph."PhotoPath",
        f."CollegeName",
        f."TShirtSize",
        f."IncludeDriver"
    FROM hsc95."T_EventForm" f
    LEFT JOIN LATERAL (
        SELECT p."PhotoPath"
        FROM hsc95."T_Photos" p
        WHERE p."EntryId" = f."EntryId" AND p."PhotoStatus" = 1
        ORDER BY p."PhotoId" DESC
        LIMIT 1
    ) ph ON TRUE
    WHERE f."MemberStatus" = 1
      AND f."FormNo" IS NOT NULL
      AND (p_entryids IS NULL OR f."EntryId" = ANY (p_entryids))
      AND (p_entryby IS NULL OR f."EntryBy" = p_entryby)
    ORDER BY f."EntryId" ASC;
END;
$$ LANGUAGE plpgsql STABLE;


----------------------------------------------------------------------
-- 8. Dashboard statistics
--    Gap: no aggregate function exists. Statistics must never be
--    hard-coded in the UI.
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_get_dashboard_stats(
    p_entryby integer DEFAULT NULL
)
RETURNS TABLE (
    "TotalRegistrations" bigint,
    "ActiveRegistrations" bigint,
    "WithDriver" bigint,
    "TotalAmount" numeric,
    "WithPhoto" bigint,
    "TokensReady" bigint,
    "WithPassCode" bigint,
    "RegisteredToday" bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE f."MemberStatus" = 1),
        COUNT(*) FILTER (WHERE f."IncludeDriver" = 'Y'),
        COALESCE(SUM(f."AmountPaid"), 0),
        COUNT(*) FILTER (WHERE ph.has_photo),
        COUNT(*) FILTER (WHERE f."MemberStatus" = 1 AND f."FormNo" IS NOT NULL),
        COUNT(*) FILTER (WHERE f."PassCode" IS NOT NULL AND f."PassCode" <> ''),
        COUNT(*) FILTER (WHERE f."EntryDate"::date = CURRENT_DATE)
    FROM hsc95."T_EventForm" f
    LEFT JOIN LATERAL (
        SELECT TRUE AS has_photo
        FROM hsc95."T_Photos" p
        WHERE p."EntryId" = f."EntryId" AND p."PhotoStatus" = 1
        LIMIT 1
    ) ph ON TRUE
    WHERE p_entryby IS NULL OR f."EntryBy" = p_entryby;
END;
$$ LANGUAGE plpgsql STABLE;


----------------------------------------------------------------------
-- 9. T-shirt size summary (organiser needs counts per size)
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_get_tshirt_summary(
    p_entryby integer DEFAULT NULL
)
RETURNS TABLE (
    "TShirtSize" character varying(3),
    "Total" bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT f."TShirtSize", COUNT(*)
    FROM hsc95."T_EventForm" f
    WHERE f."MemberStatus" = 1
      AND (p_entryby IS NULL OR f."EntryBy" = p_entryby)
    GROUP BY f."TShirtSize"
    ORDER BY f."TShirtSize";
END;
$$ LANGUAGE plpgsql STABLE;


----------------------------------------------------------------------
-- 10. Staff login
--    Gap: db.txt's sp_user_login declares "ContactNumber" numeric(11,0)
--    but returns the varchar column, so every call fails (see FIX A in
--    proposed/002). sp_user_login is owned by postgres and cannot be
--    replaced by the application role, so this is the same logic with a
--    correct result type: crypt() password check, the same "Login" row in
--    T_Events, and the same columns (ContactNumber as text).
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_staff_login(
    p_loginname character varying(100),
    p_password character varying(128)
)
RETURNS TABLE (
    "UserId" integer,
    "FullName" character varying(200),
    "LoginName" character varying(100),
    "ContactNumber" character varying(11),
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
      AND u."Password" = public.crypt(p_password, u."Password");

    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO hsc95."T_Events" ("EventType", "EventText")
    VALUES (
        'Login',
        'User ' || v_loginname || ' (ID: ' || v_userid || ') successfully logged in.'
    );

    RETURN QUERY
    SELECT
        u."UserId",
        u."FullName",
        u."LoginName",
        u."ContactNumber",
        u."Email",
        t."UserTypeName"
    FROM hsc95."T_Users" u
    INNER JOIN hsc95."T_UserType" t ON u."UserType" = t."UserTypeId"
    WHERE u."UserId" = v_userid;
END;
$$ LANGUAGE plpgsql;


----------------------------------------------------------------------
-- 11. SMS counter
--    Gap: T_EventForm."TotalSMSSent" exists but nothing maintains it.
--    Called after every SMS the gateway accepts (registration notice and
--    token SMS). The column is numeric(2,0), so the count stops at 99
--    instead of failing. Returns the new total (NULL if no such entry).
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_increment_sms_sent(
    p_entryid integer
)
RETURNS numeric AS $$
DECLARE
    v_total numeric;
BEGIN
    UPDATE hsc95."T_EventForm"
    SET "TotalSMSSent" = LEAST(COALESCE("TotalSMSSent", 0) + 1, 99)
    WHERE "EntryId" = p_entryid
    RETURNING "TotalSMSSent" INTO v_total;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;


----------------------------------------------------------------------
-- 12. Member gender
--    Gap: T_EventForm."Gender" (varchar(5)) exists, but db.txt's
--    sp_insert_event_form has no gender parameter and is owned by
--    postgres. The API calls this in the same transaction, right after the
--    insert. Stored as 'M' (male) or 'F' (female); NULL clears it.
--    Returns false if the entry does not exist.
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hsc95.sp_set_event_form_gender(
    p_entryid integer,
    p_gender character varying(5)
)
RETURNS boolean AS $$
BEGIN
    IF p_gender IS NOT NULL AND p_gender NOT IN ('M', 'F') THEN
        RAISE EXCEPTION 'Gender must be M or F' USING ERRCODE = '22023';
    END IF;

    UPDATE hsc95."T_EventForm"
    SET "Gender" = p_gender
    WHERE "EntryId" = p_entryid;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
