/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

type AuthListener = (event: string, session: { user: { id: string } } | null) => void;
type SessionResult = {
  data: { session: { user: { id: string } } | null };
  error: { message: string } | null;
};

const harness = vi.hoisted(() => {
  const listeners = new Set<AuthListener>();
  return {
    listeners,
    getSession: vi.fn<() => Promise<SessionResult>>(),
    unsubscribe: vi.fn(),
    emit(event: string, session: { user: { id: string } } | null) {
      for (const listener of [...listeners]) listener(event, session);
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/persistence/supabaseBrowserClient", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => harness.getSession(),
      onAuthStateChange: (callback: AuthListener) => {
        harness.listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                harness.listeners.delete(callback);
                harness.unsubscribe();
              },
            },
          },
        };
      },
    },
  }),
}));

import { AppFrame } from "@/components/AppFrame";

const SECRET = "bootstrap-secret-detail";
let root: Root | null = null;
let container: HTMLDivElement | null = null;

function session(): { user: { id: string } } {
  return { user: { id: "user-1" } };
}

function settled(value: SessionResult): Promise<SessionResult> {
  return Promise.resolve(value);
}

async function renderFrame(children: ReactNode = <p>Signed-in field</p>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<AppFrame>{children}</AppFrame>);
  });
  return container;
}

function text(): string {
  return container?.textContent ?? "";
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
  harness.listeners.clear();
  harness.getSession.mockReset();
  harness.unsubscribe.mockClear();
});

describe("auth bootstrap", () => {
  it("leaves checking when the initial read finds no session, without an initial auth event", async () => {
    let resolveSession: (result: SessionResult) => void = () => undefined;
    harness.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );

    await renderFrame();
    await act(async () => {
      harness.emit("INITIAL_SESSION", null);
    });
    expect(text()).toContain("Checking session.");
    expect(harness.listeners.size).toBe(1);

    await act(async () => {
      resolveSession({ data: { session: null }, error: null });
    });
    expect(text()).not.toContain("Checking session.");
    expect(text()).toContain("Sign in");
    expect(text()).toContain("Email");
    expect(text()).not.toContain("Signed-in field");
  });

  it("leaves checking and renders children when the initial read finds a session", async () => {
    harness.getSession.mockImplementation(() => settled({ data: { session: session() }, error: null }));
    await renderFrame();
    expect(text()).not.toContain("Checking session.");
    expect(text()).toContain("Signed-in field");
    expect(text()).not.toContain("Sign in");
  });

  it("applies a later auth event after the initial read has settled", async () => {
    harness.getSession.mockImplementation(() => settled({ data: { session: null }, error: null }));
    await renderFrame();
    expect(text()).toContain("Sign in");

    await act(async () => {
      harness.emit("SIGNED_IN", session());
    });
    expect(text()).toContain("Signed-in field");
    expect(text()).not.toContain("Checking session.");

    await act(async () => {
      harness.emit("SIGNED_OUT", null);
    });
    expect(text()).toContain("Sign in");
    expect(text()).not.toContain("Signed-in field");
  });

  it("does not let a stale initial read replace a newer auth event", async () => {
    let resolveSession: (result: SessionResult) => void = () => undefined;
    harness.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    await renderFrame();
    expect(text()).toContain("Checking session.");

    await act(async () => {
      harness.emit("SIGNED_IN", session());
    });
    expect(text()).toContain("Signed-in field");

    await act(async () => {
      resolveSession({ data: { session: null }, error: null });
    });
    expect(text()).toContain("Signed-in field");
    expect(text()).not.toContain("Sign in");
    expect(text()).not.toContain("Checking session.");
  });

  it("shows a failed check when the initial read returns an error, and does not sign the user out", async () => {
    harness.getSession.mockImplementation(() =>
      settled({ data: { session: null }, error: { message: SECRET } }),
    );
    await renderFrame();
    expect(text()).not.toContain("Checking session.");
    expect(text()).toContain("The session could not be checked.");
    expect(text()).not.toContain("Sign in");
    expect(text()).not.toContain("Email");
    expect(text()).not.toContain(SECRET);
    expect(text()).toContain("Try again");
  });

  it("shows a failed check when the initial read throws, without the thrown text", async () => {
    harness.getSession.mockImplementation(() => Promise.reject(new Error(SECRET)));
    await renderFrame();
    expect(text()).toContain("The session could not be checked.");
    expect(text()).not.toContain("Checking session.");
    expect(text()).not.toContain("Sign in");
    expect(text()).not.toContain(SECRET);
  });

  it("retries on one subscription and can then resolve signed out", async () => {
    harness.getSession.mockImplementationOnce(() =>
      settled({ data: { session: null }, error: { message: SECRET } }),
    );
    let resolveRetry: (result: SessionResult) => void = () => undefined;
    harness.getSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
    );
    await renderFrame();
    expect(harness.listeners.size).toBe(1);

    await act(async () => {
      const button = [...(container?.querySelectorAll("button") ?? [])].find(
        (item) => item.textContent === "Try again",
      );
      button?.click();
    });
    expect(text()).toContain("Checking session.");
    expect(harness.listeners.size).toBe(1);
    expect(harness.getSession).toHaveBeenCalledTimes(2);
    expect(harness.unsubscribe).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRetry({ data: { session: null }, error: null });
    });
    expect(text()).toContain("Sign in");
    expect(text()).not.toContain("The session could not be checked.");
    expect(harness.listeners.size).toBe(1);
  });

  it("drops a read that settles after unmount", async () => {
    let resolveSession: (result: SessionResult) => void = () => undefined;
    harness.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    await renderFrame();
    expect(harness.listeners.size).toBe(1);
    const resolveFirst = resolveSession;

    await act(async () => {
      root?.unmount();
    });
    root = null;
    expect(harness.listeners.size).toBe(0);
    expect(harness.unsubscribe).toHaveBeenCalledTimes(1);

    let resolveSecond: (result: SessionResult) => void = () => undefined;
    harness.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <AppFrame>
          <p>Signed-in field</p>
        </AppFrame>,
      );
    });
    expect(text()).toContain("Checking session.");

    await act(async () => {
      resolveFirst({ data: { session: session() }, error: null });
    });
    expect(text()).toContain("Checking session.");
    expect(text()).not.toContain("Signed-in field");

    await act(async () => {
      resolveSecond({ data: { session: null }, error: null });
    });
    expect(text()).toContain("Sign in");
  });

  it("keeps production and the historical instrument on the same frame", () => {
    const source = readFileSync("components/AppFrame.tsx", "utf8");
    expect(source).toContain("getSession");
    expect(source).toContain("onAuthStateChange");
    expect(source).toContain('pathname === "/instrument"');
    expect(source).toContain('pathname === "/"');
    expect(source).not.toContain("/desktop-reading");
    expect(source).not.toMatch(/localStorage|sessionStorage/);
  });
});
