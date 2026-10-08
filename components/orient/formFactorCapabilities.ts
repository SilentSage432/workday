/**
 * Cross-form-factor capability contract.
 *
 * SEMANTIC PARITY + FORM-FACTOR-SPECIFIC COMPOSITION
 *
 * Orient's ontology, authority boundaries, and established human capabilities
 * remain consistent across form factors. Layout, density, navigation mechanics,
 * and interaction affordances may adapt to the physical device.
 *
 * Any form-factor-specific capability must declare `specialization` or its
 * absence on one form is a defect.
 *
 * This registry is declarative for documentation and tests. It is not a runtime
 * router.
 */

export type FormFactor = "phone" | "desktop";

export type CapabilityDoorway = {
  /** Stable human-path description for tests and docs. */
  path: string;
  /** Preferred production opener selector when a standing control exists. */
  opener?: string;
};

export type FormFactorCapability = {
  id: string;
  phone: CapabilityDoorway;
  desktop: CapabilityDoorway;
  /** When set, parity does not require the other form to expose this capability. */
  specialization?: {
    form: FormFactor;
    reason: string;
  };
};

export const FORM_FACTOR_CAPABILITIES: readonly FormFactorCapability[] = [
  {
    id: "temporal-questions",
    phone: { path: "LOOK → Present/Day/Week/Month", opener: "[data-look-control]" },
    desktop: { path: "LOOK → Present/Day/Week/Month", opener: "[data-look-control]" },
  },
  {
    id: "exact-time",
    phone: { path: "Exact time control on Present/Day reading", opener: "[data-exact-time]" },
    desktop: { path: "Exact time control on Present/Day reading", opener: "[data-exact-time]" },
  },
  {
    id: "all-day-establish",
    phone: { path: "ADD → All day", opener: "[data-add-control]" },
    desktop: { path: "ADD → All day (also DesktopReading All day)", opener: "[data-add-control]" },
  },
  {
    id: "task-establish",
    phone: { path: "ADD → Task → DirectTask", opener: "[data-add-control]" },
    desktop: { path: "ADD → Task → DirectTask", opener: "[data-add-control]" },
  },
  {
    id: "note-establish",
    phone: { path: "ADD → Note → DirectNote", opener: "[data-add-control]" },
    desktop: { path: "ADD → Note → DirectNote", opener: "[data-add-control]" },
  },
  {
    id: "notes-return",
    phone: { path: "LOOK → Notes", opener: "[data-look-control]" },
    desktop: { path: "LOOK → Notes", opener: "[data-look-control]" },
  },
  {
    id: "act",
    phone: { path: "standing ACT → ActSurface", opener: "[data-act-control]" },
    desktop: { path: "standing ACT → ActSurface", opener: "[data-act-control]" },
  },
  {
    id: "stewardship-establish",
    phone: { path: "ADD → Stewardship", opener: "[data-add-control]" },
    desktop: { path: "ADD → Stewardship", opener: "[data-add-control]" },
  },
  {
    id: "stewardship-manage",
    phone: { path: "LOOK → Stewardship", opener: "[data-look-control]" },
    desktop: { path: "LOOK → Stewardship", opener: "[data-look-control]" },
  },
  {
    id: "recurring-task-establish",
    phone: { path: "ADD → Recurring Task", opener: "[data-add-control]" },
    desktop: { path: "ADD → Recurring Task", opener: "[data-add-control]" },
  },
  {
    id: "recurring-task-manage",
    phone: { path: "LOOK → Recurring Tasks", opener: "[data-look-control]" },
    desktop: { path: "LOOK → Recurring Tasks", opener: "[data-look-control]" },
  },
  {
    id: "work-manage",
    phone: { path: "LOOK → Manage Work schedule", opener: "[data-look-control]" },
    desktop: { path: "LOOK → Manage Work schedule", opener: "[data-look-control]" },
  },
  {
    id: "external-source-manage",
    phone: { path: "LOOK → Google Calendar", opener: "[data-look-control]" },
    desktop: { path: "LOOK → Google Calendar", opener: "[data-look-control]" },
  },
  {
    id: "desktop-week-dtm",
    phone: { path: "not offered on phone", opener: undefined },
    desktop: { path: "Week landscape direct temporal manipulation", opener: undefined },
    specialization: {
      form: "desktop",
      reason: "DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001 V1 is desktop Week only.",
    },
  },
];

export type FormFactorCapabilityId = (typeof FORM_FACTOR_CAPABILITIES)[number]["id"];

export function parityRequiredCapabilities(): FormFactorCapability[] {
  return FORM_FACTOR_CAPABILITIES.filter((entry) => entry.specialization === undefined);
}

export function specializedCapabilities(): FormFactorCapability[] {
  return FORM_FACTOR_CAPABILITIES.filter((entry) => entry.specialization !== undefined);
}
