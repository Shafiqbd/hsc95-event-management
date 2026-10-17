----------------------------------------------------------------------
-- 003_recommended_extensions.sql            *** PROPOSED - REVIEW FIRST ***
--
-- Schema extensions for features the paper form has but the supplied
-- schema cannot store. NOT applied automatically and NOT required for the
-- current web application to run. Nothing here is used by the code yet.
----------------------------------------------------------------------


-- 1. Integrity: prevent duplicate logins and duplicate form numbers.
--    (Check existing data for duplicates before creating these.)
CREATE UNIQUE INDEX IF NOT EXISTS "UX_T_Users_LoginName"
    ON hsc95."T_Users" (lower("LoginName"));

CREATE UNIQUE INDEX IF NOT EXISTS "UX_T_EventForm_FormNo"
    ON hsc95."T_EventForm" ("FormNo")
    WHERE "FormNo" IS NOT NULL;


-- 2. Payment method / reference / verification.
--    The paper form has "ক্যাশ" / "বিকাশ/নগদ নং-" but T_EventForm only has
--    AmountPaid, so the app shows every payment as UNVERIFIED.
ALTER TABLE hsc95."T_EventForm"
    ADD COLUMN IF NOT EXISTS "PaymentMethod"    character varying(10),   -- CASH | BKASH | NAGAD
    ADD COLUMN IF NOT EXISTS "PaymentRef"       character varying(50),   -- wallet number / TrxID
    ADD COLUMN IF NOT EXISTS "PaymentVerified"  character(1) NOT NULL DEFAULT 'N',
    ADD COLUMN IF NOT EXISTS "PaymentVerifiedBy" numeric(5,0),
    ADD COLUMN IF NOT EXISTS "PaymentVerifiedAt" timestamp without time zone;

CREATE OR REPLACE FUNCTION hsc95.sp_verify_payment(
    p_entryid integer,
    p_verifiedby numeric(5,0)
)
RETURNS boolean AS $$
BEGIN
    UPDATE hsc95."T_EventForm"
       SET "PaymentVerified" = 'Y',
           "PaymentVerifiedBy" = p_verifiedby,
           "PaymentVerifiedAt" = CURRENT_TIMESTAMP
     WHERE "EntryId" = p_entryid;

    INSERT INTO hsc95."T_Events" ("EventType", "EventText")
    VALUES ('PaymentVerified', 'Entry ' || p_entryid || ' verified by user ' || p_verifiedby);

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- 3. Gender (লিঙ্গ) - present on the paper form, absent from T_EventForm.
ALTER TABLE hsc95."T_EventForm"
    ADD COLUMN IF NOT EXISTS "Gender" character(1);  -- M | F


-- 4. Pass code assignment. PassCode varchar(8) is the "Token Number" sent
--    by sp_SendToken_sms, but nothing generates it. Assigns a random,
--    unique 6-digit code to every active registration that has none.
CREATE OR REPLACE FUNCTION hsc95.sp_assign_missing_passcodes()
RETURNS integer AS $$
DECLARE
    r record;
    v_code character varying(8);
    v_count integer := 0;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('hsc95.passcode'));
    FOR r IN
        SELECT f."EntryId" FROM hsc95."T_EventForm" f
        WHERE (f."PassCode" IS NULL OR f."PassCode" = '') AND f."MemberStatus" = 1
        ORDER BY f."EntryId"
    LOOP
        LOOP
            v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM hsc95."T_EventForm" x WHERE x."PassCode" = v_code
            );
        END LOOP;
        UPDATE hsc95."T_EventForm" SET "PassCode" = v_code WHERE "EntryId" = r."EntryId";
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
