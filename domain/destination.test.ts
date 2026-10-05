import { describe, expect, it } from "vitest";
import {
  establishedAtFromAct,
  requireDestinationContent,
  requireDestinationId,
  requireEstablishedAt,
} from "@/domain/destination";

const DESTINATION_ID = "00000000-0000-4000-8000-000000000001";

describe("destination domain", () => {
  it("keeps a destination as identity, human words, and the establishment instant", () => {
    expect(requireDestinationId(DESTINATION_ID)).toBe(DESTINATION_ID);
    expect(requireDestinationContent("  learn the floor  ")).toBe("  learn the floor  ");
    expect(establishedAtFromAct(new Date("2026-10-05T16:00:00.000Z"))).toBe(
      "2026-10-05T16:00:00.000Z",
    );
  });

  it("rejects blank words", () => {
    expect(() => requireDestinationContent("")).toThrow(/human's words/);
    expect(() => requireDestinationContent(" \n\t ")).toThrow(/human's words/);
  });

  it("does not rewrite the human's words", () => {
    expect(requireDestinationContent("  run the department  ")).toBe("  run the department  ");
  });

  it("records an establishment instant and rejects a civil date", () => {
    expect(requireEstablishedAt("2026-10-05T16:00:00.000Z")).toBe("2026-10-05T16:00:00.000Z");
    expect(requireEstablishedAt("2026-10-05T16:00:00+00:00")).toBe("2026-10-05T16:00:00.000Z");
    expect(() => requireEstablishedAt("2026-10-05")).toThrow(/when it was established/);
    expect(() => requireEstablishedAt("not-an-instant")).toThrow(/when it was established/);
    expect(() => establishedAtFromAct(new Date("nope"))).toThrow(/when it was established/);
  });

  it("rejects a malformed identity", () => {
    expect(() => requireDestinationId("")).toThrow(/stable identity/);
    expect(() => requireDestinationId("destination-1")).toThrow(/stable identity/);
  });
});
