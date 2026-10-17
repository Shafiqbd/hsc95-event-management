----------------------------------------------------------------------
-- 000_prerequisites.sql
--
-- Run ONCE on a fresh database BEFORE db.txt.
--
-- db.txt references sequences it never creates and calls crypt()/gen_salt()
-- (pgcrypto). On an existing production database these objects already
-- exist, and every statement below is a no-op.
----------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS hsc95;

CREATE SEQUENCE IF NOT EXISTS hsc95."T_Users_UserId_seq";
CREATE SEQUENCE IF NOT EXISTS hsc95."T_EventForm_EntryId_seq";
CREATE SEQUENCE IF NOT EXISTS hsc95."T_Events_LogId_seq";
