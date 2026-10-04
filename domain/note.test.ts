import { describe, expect, it } from "vitest";
import {
  capturedAtFromEstablishment,
  requireCapturedAt,
  requireNoteContent,
  requireNoteId,
} from "@/domain/note";

const NOTE_ID = "00000000-0000-4000-8000-000000000001";

describe("note domain", () => {
  it("keeps a retained note as identity, content, and capture instant", () => {
    expect(requireNoteId(NOTE_ID)).toBe(NOTE_ID);
    expect(requireNoteContent("  aisle 12  ")).toBe("  aisle 12  ");
    expect(capturedAtFromEstablishment(new Date("2026-10-04T18:30:00.000Z"))).toBe(
      "2026-10-04T18:30:00.000Z",
    );
  });

  it("rejects blank content", () => {
    expect(() => requireNoteContent("")).toThrow(/retained experience/);
  });

  it("rejects whitespace-only content", () => {
    expect(() => requireNoteContent(" \n\t ")).toThrow(/retained experience/);
  });

  it("does not rewrite meaningful content", () => {
    expect(requireNoteContent("  Call the school  ")).toBe("  Call the school  ");
  });

  it("round-trips a supplied capture instant and rejects a civil date", () => {
    expect(requireCapturedAt("2026-10-04T18:30:00.000Z")).toBe("2026-10-04T18:30:00.000Z");
    expect(requireCapturedAt("2026-10-04T18:30:00+00:00")).toBe("2026-10-04T18:30:00.000Z");
    expect(() => requireCapturedAt("2026-10-04")).toThrow(/when it was retained/);
    expect(() => requireCapturedAt("not-an-instant")).toThrow(/when it was retained/);
    expect(() => capturedAtFromEstablishment(new Date("nope"))).toThrow(/when it was retained/);
  });

  it("rejects a malformed identity", () => {
    expect(() => requireNoteId("")).toThrow(/stable identity/);
    expect(() => requireNoteId("note-1")).toThrow(/stable identity/);
  });
});