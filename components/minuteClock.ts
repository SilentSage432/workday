/** Local times are stored to the minute. The next minute is enough to notice a boundary. */
export function millisecondsUntilNextMinute(instant: Date): number {
  return 60_000 - (instant.getSeconds() * 1000 + instant.getMilliseconds());
}
