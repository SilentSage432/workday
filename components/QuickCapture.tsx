"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useCapture } from "@/components/AppFrame";
import { CapturePanel, type CaptureContextOption } from "@/components/CapturePanel";
import type { Task } from "@/domain/task";

export function QuickCapture({
  contexts,
  onCreated,
}: {
  contexts: readonly CaptureContextOption[];
  onCreated?: (task: Task) => void;
}) {
  const { session, update, saving, saveError, submit } = useCapture();
  const titleRef = useRef<HTMLInputElement>(null);
  const wasSaving = useRef(false);

  useEffect(() => {
    const saved = wasSaving.current && !saving && saveError === null;
    wasSaving.current = saving;
    if (saved) titleRef.current?.focus();
  }, [saving, saveError]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit().then((created) => {
      if (created) onCreated?.(created);
    });
  }

  return (
    <CapturePanel
      session={session}
      contexts={contexts}
      saving={saving}
      saveError={saveError}
      titleRef={titleRef}
      onChange={update}
      onSubmit={onSubmit}
    />
  );
}
