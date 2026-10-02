export const CANONICAL_CONTEXT_NAMES = ["Work", "Family", "TeamLab", "Financial"] as const;

export type CanonicalContextName = (typeof CANONICAL_CONTEXT_NAMES)[number];

export type Context = {
  id: string;
  name: string;
  createdAt: string;
};
