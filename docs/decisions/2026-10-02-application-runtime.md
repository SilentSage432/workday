# Application runtime

Date: 2026-10-02.

## Decision

V0 is a Next.js App Router application using React, TypeScript, and Tailwind CSS.

Tailwind is the styling mechanism. It is not a visual design system.

Versions are the current stable releases when bootstrap installs them.

## Context

The product needs one mobile-first surface on phone and desktop, fast capture, and a server-side place for future secrets. A client-only site cannot hold Google OAuth credentials safely. A second backend would be extra machinery for one user.

## Consequences

- UI code stays in `app/` and `components/`. Domain and projection code must not import them.
- The browser may talk to Supabase directly. NOW must not gain a required server round trip just because time passed.
- No native app, no separate API service, and no design-system package.

Full boundary: [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md).
