import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toTaskInsert, toTaskUpdate } from "@/persistence/contextTaskMapping";

const NOTE_ID = "00000000-0000-4000-8000-000000000001";
const migration = readFileSync(
  new URL("../supabase/migrations/20261005020600_task_originating_note.sql", import.meta.url),
  "utf8",
);

describe("task provenance storage", () => {
  it("keeps an ordinary task valid with no originating note", () => {
    const inserted = toTaskInsert("user-1", { title: "Call the school" });
    expect(inserted.originating_note_id).toBeNull();
    expect(inserted.origin).toBe("user_created");
  });

  it("puts one originating note on the same task insert", () => {
    const first = toTaskInsert("user-1", {
      title: "Check the department",
      originatingNoteId: NOTE_ID,
    });
    const second = toTaskInsert("user-1", {
      title: "Ask receiving",
      originatingNoteId: NOTE_ID,
    });
    expect(first.originating_note_id).toBe(NOTE_ID);
    expect(second.originating_note_id).toBe(NOTE_ID);
    expect(first.origin).toBe("user_created");
    expect(second.origin).toBe("user_created");
    expect(first.title).not.toBe(second.title);
  });

  it("does not write provenance from a task edit", () => {
    expect(toTaskUpdate({ title: "Check the department" })).not.toHaveProperty("originating_note_id");
    expect(toTaskUpdate({ mustDo: true })).toEqual({ must_do: true });
  });

  it("cites a same-owner note without deciding note deletion", () => {
    expect(migration).toContain("add column originating_note_id uuid");
    expect(migration).toContain("foreign key (originating_note_id, user_id)");
    expect(migration).toContain("references public.notes (id, user_id)");
    expect(migration).toContain("match simple");
    expect(migration).toContain("on delete no action");
    expect(migration).toContain("deferrable initially deferred");
    expect(migration).not.toMatch(/on delete cascade|on delete set null|on delete set default/i);
    expect(migration).not.toMatch(/unique \(originating_note_id/);
    expect(migration).not.toMatch(/grant\s+.*delete/i);
    expect(migration).not.toMatch(/alter table public\.notes/i);
    expect(migration).not.toMatch(/protected_time|blocks|commitments|active_thread/);
  });

  it("establishes a sourced task in one task insert", () => {
    const source = readFileSync(new URL("./contextsAndTasks.ts", import.meta.url), "utf8");
    const create = source.slice(
      source.indexOf("export async function createTask"),
      source.indexOf("export async function loadOpenTasks"),
    );
    expect(create.match(/\.insert\(/g)).toHaveLength(1);
    expect(create).toContain('.from("tasks")');
    expect(create).not.toMatch(/catch|from\("notes"\)|\.update\(|\.delete\(/);
    expect(source).toContain("originating_note_id");
  });

  it("does not give a note a derived-fact collection or a lifecycle", () => {
    const note = readFileSync(new URL("../domain/note.ts", import.meta.url), "utf8");
    const noteStore = readFileSync(new URL("./note.ts", import.meta.url), "utf8");
    expect(note).not.toMatch(/tasks|derived|originatingNoteId/);
    expect(noteStore).not.toMatch(/\.update\(|\.delete\(|updateNote|deleteNote|archiveNote/);
    const block = readFileSync(new URL("../domain/block.ts", import.meta.url), "utf8");
    const commitment = readFileSync(new URL("../domain/commitment.ts", import.meta.url), "utf8");
    const protectedTime = readFileSync(new URL("../domain/protectedTime.ts", import.meta.url), "utf8");
    expect(block).not.toContain("originatingNoteId");
    expect(commitment).not.toContain("originatingNoteId");
    expect(protectedTime).not.toContain("originatingNoteId");
  });
});
