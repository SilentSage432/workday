import type { LucideIcon } from "lucide-react";

export function Icon({ icon: Glyph }: { icon: LucideIcon }) {
  return <Glyph aria-hidden="true" className="size-5 shrink-0" />;
}
