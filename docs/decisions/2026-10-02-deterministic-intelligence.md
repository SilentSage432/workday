# Deterministic intelligence

Date: 2026-10-02.

## Decision

This product's runtime intelligence is deterministic.

Orientation is derived from explicit facts, temporal relationships, provenance, deterministic rules, and human-established meaning.

AI, large language models, machine learning, and agentic inference are outside the product architecture. They may be used to develop the software. They are not part of its runtime.

This is an architectural constraint. It is not a deferral until a later version.

## Context

Work orientation has to answer where the user is in an established Work day. That answer is a relationship among facts the user or the product already established: a confirmed time zone, a schedule entry, a shift type, and constants such as Power Hour. Guessing a next action, or asking a model to interpret the day, would invent meaning the product does not have.

## Consequences

- Projections take the facts they need and a supplied instant. They do not call a model, and they do not read the clock or the network themselves.
- A missing fact stays missing. Unknown schedule is not Off. An intended boundary is not evidence that the work is unfinished.
- The product does not recommend, rank, or complete work because time passed.
- This repository stays separate from any other system's model or ranking engine.

The constraint is also stated in [../../PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) and [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md).
