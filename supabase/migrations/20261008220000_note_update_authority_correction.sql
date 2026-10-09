-- NOTE-LIFECYCLE-001A: converge hosted Note UPDATE authority.
-- 20261008210000 granted UPDATE (retired_at) and DELETE. That was correct in
-- isolation. Hosted verification found pre-existing table-level UPDATE for
-- authenticated on public.notes (default privileges at table creation were not
-- revoked from authenticated in 20261004180000_notes.sql). PostgreSQL grants
-- are additive, so the column-level grant did not remove table-level UPDATE.
-- This migration revokes broad UPDATE, then re-establishes lifecycle-only
-- UPDATE (retired_at). DELETE, SELECT, INSERT, RLS, and provenance are unchanged.
-- No Note rows are modified. Edit remains deferred.

revoke update on table public.notes from authenticated;

grant update (retired_at) on table public.notes to authenticated;
