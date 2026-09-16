"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/overview", label: "Overview" },
  { href: "/groups", label: "Groups" },
  { href: "/students", label: "Students" },
  { href: "/attendance", label: "Attendance" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname();

  return (
     <aside className="hidden md:flex md:flex-col w-56 shrink-0 h-screen sticky top-0 glass-strong border-r border-base-border">
      <div className="h-14 flex items-center px-5">
        <span className="text-[15px] font-semibold tracking-tight text-ink">Attendly</span>
      </div>

      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-control px-3 py-2 text-[13.5px] font-medium transition-colors duration-150",
                  active
                  ? "glass text-ink"
                  : "text-ink-muted hover:text-ink hover:bg-white/[0.05]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-base-border">
        <div className="flex items-center gap-2.5 rounded-control px-2 py-2">
          <div className="h-7 w-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[12px] font-semibold shrink-0">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink truncate">{userName}</p>
            <p className="text-[12px] text-ink-faint truncate">{userEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
