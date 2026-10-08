import { civilDateInTimeZone, addCivilDays, formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import { instantFromZonedLocal, requireIanaTimeZone } from "@/domain/time/localTime";

/** V1: 7 civil days past through 42 civil days future (inclusive) relative to Orient today. */
export const OBSERVATION_HORIZON_PAST_DAYS = 7;
export const OBSERVATION_HORIZON_FUTURE_DAYS = 42;

export type ObservationHorizon = {
  /** Inclusive first civil date of the observation window (Orient zone). */
  windowStartsOn: string;
  /** Exclusive civil end of the observation window (Orient zone). */
  windowEndsBefore: string;
  /**
   * Google events.list timeMin: exclusive lower bound on event END.
   * Set to the instant at the start of windowStartsOn in Orient zone (UTC Z).
   */
  timeMin: string;
  /**
   * Google events.list timeMax: exclusive upper bound on event START.
   * Set to the instant at the start of windowEndsBefore in Orient zone (UTC Z).
   */
  timeMax: string;
};

/**
 * Compute the bounded V1 observation horizon from Orient's authoritative civil today.
 * Google overlap: end > timeMin AND start < timeMax.
 */
export function computeObservationHorizon(input: {
  now: Date;
  timeZone: string;
}): ObservationHorizon {
  const timeZone = requireIanaTimeZone(input.timeZone);
  const today = formatCivilDate(civilDateInTimeZone(input.now, timeZone));
  const windowStartsOn = formatCivilDate(
    addCivilDays(parseCivilDate(today), -OBSERVATION_HORIZON_PAST_DAYS),
  );
  const windowEndsBefore = formatCivilDate(
    addCivilDays(parseCivilDate(today), OBSERVATION_HORIZON_FUTURE_DAYS + 1),
  );
  const timeMinInstant = instantFromZonedLocal(windowStartsOn, "00:00", timeZone);
  const timeMaxInstant = instantFromZonedLocal(windowEndsBefore, "00:00", timeZone);
  return {
    windowStartsOn,
    windowEndsBefore,
    timeMin: timeMinInstant.toISOString(),
    timeMax: timeMaxInstant.toISOString(),
  };
}
