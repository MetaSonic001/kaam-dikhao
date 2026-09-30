"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Locate, Search } from "lucide-react";
import { Button } from "../ui";
import { useT } from "@/lib/i18n";

export function HeroSearch() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const submit = (v: string) => router.push(`/projects?q=${encodeURIComponent(v)}`);
  const examples = [t("hero.ex1"), t("hero.ex2"), t("hero.ex3")];
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) submit(q.trim()); }} className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-[var(--shadow-float)] sm:flex-row" role="search">
        <label className="flex flex-1 items-center gap-2 px-3">
          <Search className="size-5 shrink-0 text-ink-3" aria-hidden />
          <span className="sr-only">{t("hero.search")}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("hero.search")} className="h-11 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3" />
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.push("/explore?near=1")}><Locate className="size-4" />{t("hero.nearMe")}</Button>
          <Button type="submit" className="flex-1 sm:flex-none">{t("hero.searchBtn")}</Button>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-white/70">
        <span>{t("hero.try")}</span>
        {examples.map((e) => (
          <button key={e} onClick={() => submit(e)} className="rounded-full border border-white/20 px-3 py-1 text-white/90 transition hover:bg-white/10">{e}</button>
        ))}
      </div>
    </div>
  );
}
