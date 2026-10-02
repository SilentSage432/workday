# Persistence and authentication

Date: 2026-10-02.

## Decision

Durable truth is Supabase Postgres in a new project dedicated to this product. Authentication is Supabase Auth for one provisioned user. Public sign-up is disabled. There are no roles or teams.

The project must not be shared with Wealth Engine, DeptSync, Carb Buddy, or any other TeamLab system.

The daily sign-in is email and password with a persisted session. Google login is not the application login.

Application tables use row-level security bound to the signed-in user. The service-role key is not on the application path.

## Context

State has to survive a phone and a desktop. Personal and family facts have to be unreadable to the anonymous key and to any other account. A shared Supabase project would couple this system to products whose truth it does not own.

## Consequences

- No schema or project is created in ARCHITECTURE-001.
- Future tables follow domain types. They are not one generic event table.
- Context membership is one optional reference. A many-to-many table is out of scope until the product allows several Contexts on one item.
- User-owned commitments and external calendar facts, when those exist, are stored apart.

Full boundary: [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md).
