# AUTH-BOOTSTRAP-RELIABILITY-001 — session check settles

The signed-in shell no longer waits on `INITIAL_SESSION` as its only way out of “Checking session.”

## Lifecycle

Startup renders the checking line. The browser client then does two things, in this order:

1. Subscribe to `onAuthStateChange` for later sign-in, sign-out, and token changes.
2. Read `getSession()` and establish the phase from that result.

The phase then becomes signed in, signed out, or an explicit failed check. A settled initial read is not left on the checking line.

`INITIAL_SESSION` may still arrive. It is ignored. The initial read is the bootstrap authority, so that event cannot be required and cannot turn a failed read into a signed-out form.

## Ordering

The subscription is registered before `getSession()` is called. If a later auth event arrives while that read is still pending, the event is marked newer and applied immediately. When the read settles, it does not replace that newer phase.

A read that settles after the shell unmounts does not update the shell. Retry replaces the previous subscription. It uses the same browser client. It does not start a second client or leave the previous subscription in place.

## Failure

An initial read that returns an error, or throws, is not signed out. The shell says the session could not be checked and offers one retry. The exception text is not shown. Retry does not clear storage and does not sign the user out.

No session and a failed check stay different.

## Boundary

This is the shell in `components/AppFrame.tsx`. A later tranche, [PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md](PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md), retired the temporary `/desktop-reading` inspection route. `/` is the production instrument. `/instrument` remains historical. No Supabase project, key, schema, or domain behavior changes here.

Development requests from `127.0.0.1` are allowed in `next.config.ts`. The dev server's own hostname is `localhost`. Those are different origins. A blocked dev client never runs the session check, so the server-rendered “Checking session.” line stays. This allowance is development only.
