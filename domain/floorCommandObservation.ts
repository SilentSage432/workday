/**
 * Orient-side reading of Floor Command's published operational snapshot.
 * Source version: deptsync.floor-command.orient.v1.
 *
 * This module does not fetch, persist, or write Floor Command.
 * It does not create a Task, Commitment, Block, Protected Time, or Stewardship row.
 */

export const FLOOR_COMMAND_SOURCE = "deptsync.floor-command.orient.v1" as const;

export const FLOOR_COMMAND_THIS_WEEK_HREF = "https://deptsync-hub.vercel.app/dashboard" as const;

export const FLOOR_COMMAND_WEEK_IDENTITY = "floor_command_iso_week" as const;

export type FloorCommandHandoffStatus = "none" | "pending" | "partial" | "complete";

export type FloorCommandAssignmentInput = {
  id: string;
  assignment_id: string;
  bay_id: string;
  department: string;
  roster_specialist_id: string | null;
  associate_name: string;
  assignment_status: string;
  zebra_confirmation: "unconfirmed" | "confirmed";
  zebra_entered_at: string | null;
  zebra_task_completed: false;
  deadline: null | {
    id: string;
    target_date: string;
    final_date: string;
    review_required: boolean;
    dates_overridden: boolean;
    confirmed_at: string;
  };
  updated_at: string | null;
};

export type FloorCommandDeadlineInput = {
  id: string;
  roster_specialist_id: string;
  associate_name: string;
  target_date: string;
  final_date: string;
  review_required: boolean;
  dates_overridden: boolean;
  confirmed_at: string;
  published_entry_ids: string[];
};

export type FloorCommandSnapshot = {
  source: typeof FLOOR_COMMAND_SOURCE;
  store_number: string;
  operational_week: string;
  week_starting: string;
  week_ending: string;
  publication: {
    id: string;
    status: "unpublished" | "published";
  };
  handoff: {
    id: string;
    status: FloorCommandHandoffStatus;
    deadline_date: string;
    deadline_policy: "monday_of_operational_week";
    required_count: number;
    confirmed_count: number;
    outstanding_count: number;
  };
  entries: FloorCommandAssignmentInput[];
  deadlines: {
    availability: "ready" | "unavailable";
    commitments: FloorCommandDeadlineInput[];
  };
  retired: Array<{
    id: string;
    assignment_id: string;
    bay_id: string;
    roster_specialist_id: string | null;
    reason: "cleared";
  }>;
  freshness: {
    read_at: string;
    source_updated_at: string | null;
    revision: string;
    matches_previous_revision: boolean | null;
  };
};

export type FloorCommandRead =
  | { availability: "ready"; snapshot: FloorCommandSnapshot }
  | {
      availability: "unavailable";
      reason: "assignments_unavailable" | "invalid_week" | "store_required";
      read_at: string;
    };

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_WEEK = /^\d{4}-W\d{2}$/;
const HANDOFF_STATUS = new Set<FloorCommandHandoffStatus>(["none", "pending", "partial", "complete"]);

/** Digit identity. Leading zeros do not make a second store. */
export function floorCommandStoreIdentity(storeNumber: string | null | undefined): string {
  const digits = String(storeNumber ?? "").trim().replace(/[^\d]/g, "");
  return digits.replace(/^0+/, "");
}

export function sameFloorCommandStore(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = floorCommandStoreIdentity(left);
  const b = floorCommandStoreIdentity(right);
  return a.length > 0 && a === b;
}

export function isFloorCommandSnapshot(value: FloorCommandSnapshot): boolean {
  if (value.source !== FLOOR_COMMAND_SOURCE) return false;
  if (!floorCommandStoreIdentity(value.store_number)) return false;
  if (!ISO_WEEK.test(value.operational_week)) return false;
  if (!CIVIL_DATE.test(value.week_starting) || !CIVIL_DATE.test(value.week_ending)) return false;
  if (!value.publication?.id || (value.publication.status !== "unpublished" && value.publication.status !== "published")) {
    return false;
  }
  const handoff = value.handoff;
  if (!handoff?.id || !HANDOFF_STATUS.has(handoff.status)) return false;
  if (handoff.deadline_policy !== "monday_of_operational_week") return false;
  if (!CIVIL_DATE.test(handoff.deadline_date)) return false;
  if (!Array.isArray(value.entries) || !Array.isArray(value.retired)) return false;
  if (value.deadlines?.availability !== "ready" && value.deadlines?.availability !== "unavailable") return false;
  if (!Array.isArray(value.deadlines.commitments)) return false;
  if (!value.freshness?.revision || !value.freshness.read_at) return false;
  return value.entries.every((entry) => {
    if (!entry.id || !entry.assignment_id || !entry.bay_id) return false;
    if (entry.zebra_confirmation !== "unconfirmed" && entry.zebra_confirmation !== "confirmed") return false;
    return entry.zebra_task_completed === false;
  });
}
