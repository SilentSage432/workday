# ORIENT-FLOOR-COMMAND-002A — Week sequence ordering

Local consumer change only. No route, credential, network, notification, or production migration.

When a Floor Command snapshot includes `freshness.week_sequence`, that integer is the order. A later sequence replaces the retained handoff even if the source time is missing or earlier. The same sequence and the same content revision replay. A lower sequence is rejected and is not a successful refresh. The same sequence with a different content revision is `sequence_conflict` and keeps the retained snapshot. A withheld read keeps the retained snapshot and is a failure. Dismissal still hides one revision and does not complete the handoff.

Snapshots with no sequence on either side keep the previous timestamp rule. Floor Command's comparable read now sends a sequence, including 0 before the first committed mutation.

Migration `supabase/migrations/20261024220000_floor_command_observation_sequence.sql` is in the repo only. It is not applied to the Orient project. Live connection remains **NO-GO**.

The producer record is `carpet-auditor/docs/product/DEPTSYNC_FLOOR_COMMAND_ORIENT_002A_ORDERING.md`.
