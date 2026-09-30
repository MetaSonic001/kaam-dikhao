"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { translate, type MsgKey } from "./messages";
import type { Lang } from "./types";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
];

type Ctx = { lang: Lang; t: (k: MsgKey, vars?: Record<string, string | number>) => string; setLang: (l: Lang) => void };
const I18nCtx = createContext<Ctx>({ lang: "en", t: (k) => k, setLang: () => {} });

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const setLang = useCallback((l: Lang) => {
    document.cookie = `kd_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload(); // keeps URL, filters and query string; server components re-render in the new language
  }, []);
  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t: (k, vars) => translate(lang, k, vars) }),
    [lang, setLang],
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

export function useT() {
  return useContext(I18nCtx).t;
}
