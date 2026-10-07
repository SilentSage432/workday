import type { SupabaseClient } from "@supabase/supabase-js";

export const CANONICAL_RELOAD_DELAY_MS = 100;
export const CANONICAL_CHANNEL = "orient-canonical";

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CanonicalChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export type CanonicalTable =
  | "protected_time"
  | "blocks"
  | "commitments"
  | "work_schedule_days"
  | "tasks"
  | "active_threads";

export type CanonicalBinding = {
  event: CanonicalChangeEvent;
  schema: "public";
  table: CanonicalTable;
  filter?: string;
};

export type CanonicalChannelStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

type ChangeChannel = {
  on: (
    event: "postgres_changes",
    filter: { event: CanonicalChangeEvent; schema: "public"; table: CanonicalTable; filter?: string },
    callback: () => void,
  ) => ChangeChannel;
  subscribe: (callback: (status: CanonicalChannelStatus) => void) => ChangeChannel;
};

export type CanonicalRealtimeClient = {
  channel: (name: string) => ChangeChannel;
  removeChannel: (channel: ChangeChannel) => unknown;
};

export function canonicalChangeBindings(userId: string): CanonicalBinding[] {
  if (!USER_ID.test(userId)) return [];
  const own = `user_id=eq.${userId}`;
  const owned = (table: CanonicalTable, events: readonly CanonicalChangeEvent[]): CanonicalBinding[] =>
    events.map((event) => ({ event, schema: "public", table, filter: own }));
  const unfilteredDelete = (table: "protected_time" | "blocks" | "commitments"): CanonicalBinding => ({
    event: "DELETE",
    schema: "public",
    table,
  });
  return [
    ...owned("protected_time", ["INSERT", "UPDATE"]),
    unfilteredDelete("protected_time"),
    ...owned("blocks", ["INSERT", "UPDATE"]),
    unfilteredDelete("blocks"),
    ...owned("commitments", ["INSERT", "UPDATE"]),
    unfilteredDelete("commitments"),
    ...owned("work_schedule_days", ["INSERT", "UPDATE", "DELETE"]),
    ...owned("tasks", ["INSERT", "UPDATE"]),
    ...owned("active_threads", ["INSERT", "UPDATE", "DELETE"]),
  ];
}

export function createCanonicalReload(input: {
  reload: () => void;
  delayMs?: number;
  schedule?: (callback: () => void, delayMs: number) => () => void;
}) {
  const delayMs = input.delayMs ?? CANONICAL_RELOAD_DELAY_MS;
  const schedule =
    input.schedule ??
    ((callback: () => void, ms: number) => {
      const id = setTimeout(callback, ms);
      return () => clearTimeout(id);
    });
  let cancelTimer: (() => void) | null = null;
  let closed = false;
  return {
    request() {
      if (closed || cancelTimer) return;
      cancelTimer = schedule(() => {
        cancelTimer = null;
        if (!closed) input.reload();
      }, delayMs);
    },
    close() {
      closed = true;
      cancelTimer?.();
      cancelTimer = null;
    },
  };
}

export function attachCanonicalVisibilityRecovery(
  target: {
    visibilityState: DocumentVisibilityState;
    addEventListener: (type: "visibilitychange", listener: () => void) => void;
    removeEventListener: (type: "visibilitychange", listener: () => void) => void;
  },
  request: () => void,
) {
  const onChange = () => {
    if (target.visibilityState === "visible") request();
  };
  target.addEventListener("visibilitychange", onChange);
  return () => target.removeEventListener("visibilitychange", onChange);
}

export function subscribeCanonicalChanges(client: CanonicalRealtimeClient, userId: string, request: () => void): () => void {
  const bindings = canonicalChangeBindings(userId);
  if (bindings.length === 0) return () => {};
  let channel = client.channel(CANONICAL_CHANNEL);
  for (const binding of bindings) {
    channel = channel.on("postgres_changes", binding, () => {
      request();
    });
  }
  let joined = false;
  let unhealthy = false;
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      if (!joined) {
        joined = true;
        return;
      }
      if (unhealthy) {
        unhealthy = false;
        request();
      }
      return;
    }
    if (joined && (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")) {
      unhealthy = true;
    }
  });
  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeCanonicalChangesFromBrowser(client: SupabaseClient, userId: string, request: () => void): () => void {
  return subscribeCanonicalChanges(client as unknown as CanonicalRealtimeClient, userId, request);
}
