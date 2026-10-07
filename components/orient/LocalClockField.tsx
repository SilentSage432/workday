"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { canonicalLocalClock } from "@/components/orient/localClockEntry";

export function LocalClockField({
  name,
  value,
  onCommit,
}: {
  name: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);

  useLayoutEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setText(value);
  }, [value]);

  function commit(raw: string) {
    const next = canonicalLocalClock(raw);
    if (!next) return false;
    setText(next);
    if (next !== value) onCommit(next);
    return true;
  }

  return (
    <input
      ref={inputRef}
      type="text"
      aria-label={name}
      value={text}
      // Text keeps the colon available. Numeric pads often omit it, and type="time" is the rejected picker.
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="done"
      pattern="[0-1][0-9]:[0-5][0-9]|2[0-3]:[0-5][0-9]"
      onChange={(event) => setText(event.target.value)}
      onBlur={(event) => {
        if (!commit(event.currentTarget.value)) setText(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(event.currentTarget.value);
          return;
        }
        if (event.key !== "Escape" || event.currentTarget.value === value) return;
        event.preventDefault();
        event.stopPropagation();
        setText(value);
      }}
    />
  );
}
