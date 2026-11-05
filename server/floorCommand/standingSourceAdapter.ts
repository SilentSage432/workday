/**
 * Standing-execution source seam for RELEASE-033.
 * Production standing callers must inject an adapter. The fake adapter never
 * performs network I/O and cannot fall back to Floor Command.
 */
import { assertServerOnly } from "@/server/assertServerOnly";

export type StandingSourceReadClass =
  | "snapshot"
  | "transport_failure"
  | "credential_rejected"
  | "forbidden";

export type StandingSourceRead = {
  readClass: StandingSourceReadClass;
  reason: string | null;
  synchronization: "comparable" | "withheld" | null;
  snapshot: unknown;
};

export type StandingSourceAdapterRequest = {
  operationalWeek: string;
  storeNumber: "2587";
  correlationId: string;
  standingClaimId: string;
};

export type StandingSourceAdapter = (
  request: StandingSourceAdapterRequest,
) => Promise<StandingSourceRead>;

export type FakeStandingSourceMode =
  | { kind: "snapshot"; snapshot: unknown; synchronization?: "comparable" | "withheld" }
  | { kind: "transport_failure"; reason?: string }
  | { kind: "credential_rejected" }
  | { kind: "forbidden" }
  | { kind: "malformed" }
  | { kind: "timeout" }
  | { kind: "throw"; message?: string };

export type FakeStandingSourceOptions = {
  mode: FakeStandingSourceMode | ((request: StandingSourceAdapterRequest) => FakeStandingSourceMode);
  /** Artificial delay before returning. Never performs HTTP. */
  delayMs?: number;
  onInvoke?: (request: StandingSourceAdapterRequest) => void;
};

/**
 * Deterministic fake Floor Command source. Incapable of contacting a network host.
 */
export function createFakeStandingSource(options: FakeStandingSourceOptions): StandingSourceAdapter {
  assertServerOnly("createFakeStandingSource");
  let invocations = 0;

  const adapter: StandingSourceAdapter = async (request) => {
    invocations += 1;
    options.onInvoke?.(request);
    if (options.delayMs && options.delayMs > 0) {
      await delay(options.delayMs);
    }
    const mode = typeof options.mode === "function" ? options.mode(request) : options.mode;
    switch (mode.kind) {
      case "snapshot":
        return {
          readClass: "snapshot",
          reason: null,
          synchronization: mode.synchronization ?? "comparable",
          snapshot: mode.snapshot,
        };
      case "transport_failure":
        return {
          readClass: "transport_failure",
          reason: mode.reason ?? "source_unavailable",
          synchronization: null,
          snapshot: null,
        };
      case "credential_rejected":
        return {
          readClass: "credential_rejected",
          reason: "credential_rejected",
          synchronization: null,
          snapshot: null,
        };
      case "forbidden":
        return {
          readClass: "forbidden",
          reason: "forbidden",
          synchronization: null,
          snapshot: null,
        };
      case "malformed":
        return {
          readClass: "snapshot",
          reason: null,
          synchronization: null,
          snapshot: null,
        };
      case "timeout":
        return {
          readClass: "transport_failure",
          reason: "source_unavailable",
          synchronization: null,
          snapshot: null,
        };
      case "throw":
        throw new Error(mode.message ?? "ambiguous_dispatch");
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
  };

  Object.defineProperty(adapter, "invocationCount", {
    get: () => invocations,
  });
  return adapter;
}

export function fakeStandingSourceInvocationCount(adapter: StandingSourceAdapter): number {
  const count = (adapter as StandingSourceAdapter & { invocationCount?: number }).invocationCount;
  return typeof count === "number" ? count : 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
