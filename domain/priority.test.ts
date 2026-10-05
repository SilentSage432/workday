import { describe, expect, it } from "vitest";
import {
  priorityEstablishedAtFromAct,
  requirePriorityContent,
  requirePriorityDestinationId,
  requirePriorityEstablishedAt,
  requirePriorityId,
} from "@/domain/priority";

const PRIORITY_ID = "00000000-0000-4000-8000-000000000002";
const DESTINATION_ID = "00000000-0000-4000-8000-000000000001";

describe("priority domain", () => {
  it("keeps a priority as identity, human words, one destination, and the establishment instant", () => {
    expect(requirePriorityId(PRIORITY_ID)).toBe(PRIORITY_ID);
    expect(requirePriorityContent("  showroom standards  ")).toBe("  showroom standards  ");
    expect(requirePriorityDestinationId(DESTINATION_ID)).toBe(DESTINATION_ID);
    expect(priorityEstablishedAtFromAct(new Date("2026-10-05T16:05:00.000Z"))).toBe(
      "2026-10-05T16:05:00.000Z",
    );
  });

  it("rejects blank words and a missing destination", () => {
    expect(() => requirePriorityContent("")).toThrow(/human's words/);
    expect(() => requirePriorityContent(" \n\t ")).toThrow(/human's words/);
    expect(() => requirePriorityDestinationId("")).toThrow(/established destination/);
    expect(() => requirePriorityDestinationId("not-a-destination")).toThrow(/established destination/);
  });

  it("does not rewrite the human's words", () => {
    expect(requirePriorityContent("  remain in stock  ")).toBe("  remain in stock  ");
  });

  it("records an establishment instant and rejects a civil date", () => {
    expect(requirePriorityEstablishedAt("2026-10-05T16:05:00.000Z")).toBe("2026-10-05T16:05:00.000Z");
    expect(() => requirePriorityEstablishedAt("2026-10-05")).toThrow(/when it was established/);
    expect(() => priorityEstablishedAtFromAct(new Date("nope"))).toThrow(/when it was established/);
  });

  it("rejects a malformed identity", () => {
    expect(() => requirePriorityId("priority-1")).toThrow(/stable identity/);
  });
});
