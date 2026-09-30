"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ChevronDown, Globe, LogOut, Menu, Search, Shield, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./logo";
import { buttonClass } from "./ui";
import { CommandPalette } from "./command-palette";
import { useI18n, LANGS } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { MsgKey } from "@/lib/messages";

const NAV: { href: string; key: MsgKey }[] = [
  { href: "/explore", key: "nav.explore" },
  { href: "/projects", key: "nav.projects" },
  { href: "/report-cards", key: "nav.reportCards" },
  { href: "/rti", key: "nav.rti" },
  { href: "/ask", key: "nav.ask" },
  { href: "/civic-watch", key: "nav.civicWatch" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = LANGS.find((l) => l.code === lang)!;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label="Language"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-muted">
        <Globe className="size-4" />{!compact && cur.label}<ChevronDown className="size-3.5" />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-float)]">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button role="option" aria-selected={l.code === lang} onClick={() => setLang(l.code)}
                className={cn("w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted", l.code === lang && "bg-orange-soft font-semibold text-orange-dark")}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AuthMenu() {
  const { t } = useI18n();
  const { session, me, signOut, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  if (!ready) return <div className="skeleton h-9 w-20" />;
  if (!session) return <Link href="/sign-in" className={buttonClass("ghost", "sm")}>{t("nav.signIn")}</Link>;
  const initial = (session.user.email ?? "U")[0].toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label={t("nav.account")} className="grid size-9 place-items-center rounded-full bg-navy text-sm font-bold text-white">{initial}</button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-float)]">
          <p className="truncate px-3 py-2 text-xs text-ink-3">{session.user.email}</p>
          <Link onClick={() => setOpen(false)} href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted"><User className="size-4" />{t("nav.dashboard")}</Link>
          {me && (me.role === "admin" || me.role === "moderator") && (
            <Link onClick={() => setOpen(false)} href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted"><Shield className="size-4" />{t("nav.admin")}</Link>
          )}
          <button onClick={() => { setOpen(false); void signOut(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted"><LogOut className="size-4" />{t("nav.signOut")}</button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const path = usePathname();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { setMenu(false); }, [path]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-orange focus:px-4 focus:py-2 focus:text-white">{t("nav.skip")}</a>
      <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="wrap flex h-16 items-center gap-3">
          <Logo />
          <nav className="ml-6 hidden items-center gap-0.5 xl:flex" aria-label="Main">
            {NAV.map((n) => {
              const active = path === n.href || (n.href !== "/" && path.startsWith(n.href));
              return (
                <Link key={n.href} href={n.href}
                  className={cn("relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors", active ? "text-navy" : "text-ink-2 hover:bg-surface-muted hover:text-ink")}>
                  {t(n.key)}
                  {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-orange" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setPalette(true)} aria-label={t("nav.search")}
              className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface-muted/60 pl-3 pr-2 text-[13px] text-ink-3 hover:bg-surface-muted xl:inline-flex">
              <Search className="size-4" /> {t("nav.search")}
              <kbd className="ml-6 rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink-3">Ctrl K</kbd>
            </button>
            <button onClick={() => setPalette(true)} aria-label={t("nav.search")} className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-muted xl:hidden"><Search className="size-5" /></button>
            <LanguageSwitcher compact />
            <div className="hidden sm:block"><AuthMenu /></div>
            <Link href="/report" className={cn(buttonClass("primary", "sm"), "hidden sm:inline-flex")}><Camera className="size-4" />{t("nav.report")}</Link>
            <button onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu} className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-muted xl:hidden">
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="border-t border-line bg-surface xl:hidden">
            <nav className="wrap grid gap-1 py-3" aria-label="Mobile">
              {[...NAV, { href: "/transparency", key: "nav.transparency" as MsgKey }, { href: "/methodology", key: "nav.methodology" as MsgKey }, { href: "/about", key: "nav.about" as MsgKey }].map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-surface-muted">{t(n.key)}</Link>
              ))}
              <div className="mt-2 flex items-center gap-2 border-t border-line pt-3 sm:hidden"><AuthMenu /></div>
            </nav>
          </div>
        )}
      </header>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </>
  );
}
