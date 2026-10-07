const LOCAL_CLOCK_TEXT = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** A committed local clock is `HH:MM` from 00:00 through 23:59. */
export function canonicalLocalClock(text: string): string | null {
  const trimmed = text.trim();
  if (!LOCAL_CLOCK_TEXT.test(trimmed)) return null;
  return trimmed;
}
