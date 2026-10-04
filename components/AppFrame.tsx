"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { NavigationGuardProvider } from "@/components/navigationGuard";
import {
  captureAfterFailedSave,
  captureAfterSuccessfulSave,
  initialCaptureSession,
  newTaskFromCapture,
  type CaptureSession,
} from "@/domain/capture";
import type { Task } from "@/domain/task";
import { createTask } from "@/persistence/contextsAndTasks";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";

type SessionPhase = "loading" | "signed-out" | "signed-in";

const shellClass =
  "mx-auto min-h-dvh max-w-lg overflow-x-hidden bg-stone-950 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] text-stone-100";
const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

type CaptureControls = {
  session: CaptureSession;
  update: (session: CaptureSession) => void;
  saving: boolean;
  saveError: string | null;
  submit: () => Promise<Task | null>;
};

const CaptureContext = createContext<CaptureControls | null>(null);

export function useCapture(): CaptureControls {
  const value = useContext(CaptureContext);
  if (!value) {
    throw new Error("Capture is available on the signed-in surfaces.");
  }
  return value;
}

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [capture, setCapture] = useState(() => initialCaptureSession());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);

  async function submit(): Promise<Task | null> {
    if (savingRef.current) return null;
    let intent;
    try {
      intent = newTaskFromCapture(capture.draft);
    } catch (error: unknown) {
      setSaveError(failureMessage(error, "A task title is required."));
      return null;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createTask(getSupabaseBrowserClient(), intent);
      setCapture(captureAfterSuccessfulSave());
      return created;
    } catch (error: unknown) {
      setCapture((current) => captureAfterFailedSave(current));
      setSaveError(failureMessage(error, "Could not save this task."));
      return null;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setPhase(session ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (phase === "loading") {
    return (
      <main className={shellClass}>
        <p>Checking session.</p>
      </main>
    );
  }

  if (phase === "signed-out") {
    return <SignIn />;
  }

  return (
    <CaptureContext.Provider value={{ session: capture, update: setCapture, saving, saveError, submit }}>
      <NavigationGuardProvider>
        <div className={shellClass}>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void getSupabaseBrowserClient().auth.signOut()}
              className="min-h-11 px-2 text-sm text-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300"
            >
              Sign out
            </button>
          </div>
          {children}
        </div>
        <BottomNav />
      </NavigationGuardProvider>
    </CaptureContext.Provider>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(/invalid login credentials/i.test(signInError.message) ? "That email and password did not match." : "Could not sign in.");
    }
    setSubmitting(false);
  }

  return (
    <main className={`flex flex-col ${shellClass}`}>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-stone-400">For the person this instrument belongs to.</p>
      <form className="mt-8 space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-stone-200">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting} className={`w-full ${primaryButtonClass}`}>
          {submitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
