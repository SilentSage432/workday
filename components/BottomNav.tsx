"use client";

import { CalendarDays, ListTodo } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useNavigationGuard } from "@/components/navigationGuard";

export function destinationFromPathname(pathname: string): "tasks" | "schedule" {
  return pathname === "/schedule" ? "schedule" : "tasks";
}

export function BottomNav() {
  const pathname = usePathname();
  const destination = destinationFromPathname(pathname);
  const guard = useNavigationGuard();

  function leave(event: { preventDefault: () => void }, href: string) {
    if (href !== pathname && guard?.blocked) {
      event.preventDefault();
      guard.onBlocked();
    }
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-800 bg-stone-950"
    >
      <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
        <NavLink
          href="/"
          label="Tasks"
          icon={ListTodo}
          current={destination === "tasks"}
          onLeave={leave}
        />
        <NavLink
          href="/schedule"
          label="Schedule"
          icon={CalendarDays}
          current={destination === "schedule"}
          onLeave={leave}
        />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon,
  current,
  onLeave,
}: {
  href: string;
  label: string;
  icon: typeof ListTodo;
  current: boolean;
  onLeave: (event: { preventDefault: () => void }, href: string) => void;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={(event) => onLeave(event, href)}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-300 ${
        current ? "font-medium text-stone-100" : "text-stone-400"
      }`}
    >
      <Icon icon={icon} />
      {label}
    </Link>
  );
}
