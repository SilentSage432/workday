"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type GuardApi = {
  block: (onBlocked: () => void) => void;
  clear: () => void;
  onBlocked: () => void;
};

const GuardApiContext = createContext<GuardApi | null>(null);
const GuardBlockedContext = createContext(false);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const handler = useRef<() => void>(() => undefined);
  const [blocked, setBlocked] = useState(false);
  const api = useMemo<GuardApi>(
    () => ({
      block(onBlocked) {
        handler.current = onBlocked;
        setBlocked(true);
      },
      clear() {
        setBlocked(false);
      },
      onBlocked() {
        handler.current();
      },
    }),
    [],
  );

  return (
    <GuardApiContext.Provider value={api}>
      <GuardBlockedContext.Provider value={blocked}>{children}</GuardBlockedContext.Provider>
    </GuardApiContext.Provider>
  );
}

export function useBlockNavigation(active: boolean, onBlocked: () => void) {
  const api = useContext(GuardApiContext);
  const onBlockedRef = useRef(onBlocked);

  useEffect(() => {
    onBlockedRef.current = onBlocked;
  });

  useEffect(() => {
    if (!api) return;
    if (!active) {
      api.clear();
      return;
    }
    api.block(() => onBlockedRef.current());
    return () => api.clear();
  }, [active, api]);
}

export function useNavigationGuard(): { blocked: boolean; onBlocked: () => void } | null {
  const api = useContext(GuardApiContext);
  const blocked = useContext(GuardBlockedContext);
  if (!api) return null;
  return { blocked, onBlocked: api.onBlocked };
}
