----------------------------------------------------------------------
-- 900_dev_seed.sql            *** LOCAL DEVELOPMENT ONLY ***
--
-- Mirrors the production T_UserType rows (1 Admin, 2 Register,
-- 3 Report Viewer) so a fresh local database behaves the same.
-- On a real database create the first admin with `npm run create-user`.
--
-- Creates an admin through the supplied sp_insert_user function.
-- CHANGE THE PASSWORD before using this anywhere but your own machine.
----------------------------------------------------------------------

INSERT INTO hsc95."T_UserType" ("UserTypeId", "UserTypeName")
VALUES (1, 'Admin'), (2, 'Register'), (3, 'Report Viewer')
ON CONFLICT ("UserTypeId") DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM hsc95."T_Users" WHERE "LoginName" = 'admin') THEN
        PERFORM hsc95.sp_insert_user(
            'System Administrator', 'admin', 'ChangeMe!2026',
            'admin@example.com', NULL, 1, 1
        );
    END IF;
END;
$$;
