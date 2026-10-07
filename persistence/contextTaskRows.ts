export type ContextRow = {
  id: string;
  name: string;
  created_at: string;
};

export type TaskRow = {
  id: string;
  context_id: string | null;
  title: string;
  created_at: string;
  completed_at: string | null;
  due_on: string | null;
  planned_on: string | null;
  planned_local: string | null;
  must_do: boolean;
  origin: string;
  originating_note_id: string | null;
};

export type TaskInsertRow = {
  user_id: string;
  title: string;
  context_id: string | null;
  due_on: string | null;
  planned_on: string | null;
  planned_local: string | null;
  must_do: boolean;
  origin: "user_created";
  originating_note_id: string | null;
};

export type TaskUpdateRow = {
  title?: string;
  context_id?: string | null;
  due_on?: string | null;
  planned_on?: string | null;
  planned_local?: string | null;
  must_do?: boolean;
  /** Instant when completing; null only via the reopen writer. */
  completed_at?: string | null;
};
