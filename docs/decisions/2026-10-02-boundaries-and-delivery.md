# External boundaries, delivery, and deployment

Date: 2026-10-02.

## Decision

Google Calendar, if later connected, is a server-side adapter. External facts stay externally owned, in their own store, with provenance. Read and write-back stay unauthorized. Bidirectional sync is not V0. Adapter failure must not change user-owned rows.

DeptSync and Wealth Engine are not coupled to this app.

V0 delivery of Pulse is in-app. No push provider and no watch app are chosen. A reminder remains a stored fact, not a notification channel.

Voice is a future producer of the same text capture input. No speech vendor is chosen.

Provenance is a small set of source fields on the affected rows, not an event log.

The first deploy surface is a mobile viewport and a web app manifest. Service workers and offline mutation sync are deferred.

Production deployment is Vercel from GitHub `main` at `https://github.com/SilentSage432/workday.git`. No required staging branch. Nothing is connected in this tranche.

## Context

The product already separates source authority from this system's memory. Calendar tokens and any future provider secrets have to stay off the client. Phone installability is required for real use. Offline sync and push are not required for the first day of use.

## Consequences

- `integrations/` may not import provider types into `domain/`.
- No OAuth client, notification SDK, or service worker is added by architecture or by an over-eager bootstrap.
- Environment templates name variables only. Secrets stay out of Git and out of `NEXT_PUBLIC_` values.
- Bootstrap may prepare this deployment path. It may not perform the production connection as part of architecture.

## Superseded for operational adoption

This record's "first day of use" scope is historical. Voice as "a future producer" described the first-use gate. [2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md) supersedes that gate. Voice blocks operational adoption and still waits on capture semantics. Push delivery stays unchosen and is not, by that contract, a condition of adoption. The interoperability boundary is required before adoption. Connecting every external system is not. Bidirectional sync stays unauthorized.

Full boundary: [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md).
