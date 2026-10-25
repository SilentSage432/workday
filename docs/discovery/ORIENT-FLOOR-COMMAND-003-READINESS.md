# ORIENT-FLOOR-COMMAND-003 — Integration readiness

Audit only. No route, credential, pull, mount, or production migration was added in that pass.

The disabled pull and operator approval now live in [ORIENT-FLOOR-COMMAND-004_CONNECTION_BOUNDARY.md](ORIENT-FLOOR-COMMAND-004_CONNECTION_BOUNDARY.md). The live connection remains **NO-GO**.

Floor Command can compose a published week, and Orient can store one, but the two repositories are not connected. This note does not restate the snapshot. The producer plan is `carpet-auditor/docs/product/DEPTSYNC_FLOOR_COMMAND_ORIENT_003_READINESS.md`.

## Repository

`main` at `c33dc8d`, five commits ahead of `origin/main` `9ff9f84`. The worktree is clean. Those commits are not pushed. Hosted Orient was not re-read. The observation migrations are not on `origin` and must not be treated as applied.

## What Orient already does

`applyFloorCommandRead` accepts a higher `week_sequence`, replays the same sequence and content revision, and keeps the retained handoff on a lower sequence, a sequence conflict, a withheld body, or an unavailable read. HTTP 200 is not acceptance. `synchronization: "withheld"` becomes a failed attempt and does not replace the handoff. Dismissal hides one revision and does not complete it. A later sequence is visible again. `recordFloorCommandObservation` is server-only, uses the signed-in operator, and takes the store from the binding.

The view links to Floor Command This Week and is not mounted.

## What the first connection still needs

1. Floor Command's single-statement read, so a comparable snapshot is one database snapshot.
2. The two observation migrations, after that producer read exists.
3. An explicit operator approval that calls `bind_floor_command_observation`. The browser does not choose the store.
4. The store token in a server secret. Not the Floor Command service-role key.
5. A bounded pull that preserves `week_sequence` and `synchronization` and calls `recordFloorCommandObservation`.
6. The existing view beside Work.

The pull must not create a Task, Commitment, stewardship row, or Pulse grant. A lower sequence should stay a non-success. A withheld body must stay a failure.

Live connection remains **NO-GO**.
