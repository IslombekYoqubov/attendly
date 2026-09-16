"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/overview", label: "Overview" },
  { href: "/groups", label: "Groups" },
  { href: "/attendance", label: "Attendance" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-base-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                className={clsx(
                  "flex flex-col items-center justify-center py-2.5 text-[11.5px] font-medium",
                  active ? "text-ink" : "text-ink-faint"
                )}
              >
                <span
                  className={clsx(
                    "h-1 w-1 rounded-full mb-1",
                    active ? "bg-accent" : "bg-transparent"
                  )}
                  aria-hidden
                />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
