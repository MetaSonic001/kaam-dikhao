"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, FileText, Home, Map, User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const t = useT();
  const path = usePathname();
  if (path === "/report" || path.startsWith("/explore")) {
    // full-screen map & the report flow have their own chrome
    if (path === "/report") return null;
  }
  const items = [
    { href: "/", icon: Home, label: t("mnav.home") },
    { href: "/explore", icon: Map, label: t("mnav.explore") },
    { href: "/report", icon: Camera, label: t("mnav.report"), fab: true },
    { href: "/rti", icon: FileText, label: t("mnav.rti") },
    { href: "/dashboard", icon: User, label: t("mnav.me") },
  ];
  return (
    <nav aria-label="Primary" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
        {items.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          const Icon = i.icon;
          return (
            <li key={i.href} className="flex justify-center">
              {i.fab ? (
                <Link href={i.href} className="-mt-5 flex flex-col items-center gap-0.5" aria-label={i.label}>
                  <span className="grid size-14 place-items-center rounded-full bg-orange text-white shadow-[0_6px_18px_rgba(249,115,22,0.45)] ring-4 ring-background"><Icon className="size-6" /></span>
                  <span className="pb-1 text-[11px] font-bold text-orange-dark">{i.label}</span>
                </Link>
              ) : (
                <Link href={i.href} className={cn("flex w-full flex-col items-center gap-0.5 py-1.5", active ? "text-navy" : "text-ink-3")}>
                  <Icon className={cn("size-5", active && "text-orange")} />
                  <span className="text-[11px] font-semibold">{i.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
