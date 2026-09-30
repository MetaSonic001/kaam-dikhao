import { cookies } from "next/headers";
import { translate, type MsgKey } from "./messages";
import type { Lang } from "./types";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("kd_lang")?.value;
  return v === "hi" || v === "mr" ? v : "en";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: (k: MsgKey, vars?: Record<string, string | number>) => translate(lang, k, vars) };
}
