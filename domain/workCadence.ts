/**
 * Established Work constants. They are product truth, not user-editable rows.
 * Nothing here is a Task, and nothing here selects a current cadence step.
 */

export const POWER_HOUR = {
  name: "Power Hour",
  startLocal: "10:00",
  endLocal: "14:00",
} as const;

/** Absolute morning boundary. Not a deadline, and not an 11:00 requirement. */
export const FSR_INTENDED_BEFORE_LOCAL = "10:00" as const;

export const OPENING_CADENCE_STEPS = [
  "Email",
  "Scorecard",
  "Sales and metrics",
  "Communications and issues",
  "Lowe's Safe Review",
  "Full Shelf Replenishment",
  "Associate alignment",
] as const;
