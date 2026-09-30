"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Link2, Share2 } from "lucide-react";
import { Button, Modal, useToast } from "../ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";

export function FollowButton({ siteId, initial }: { siteId: string; initial: boolean }) {
  const t = useT();
  const { token } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(initial);
  useEffect(() => { if (token) api<{ following: boolean }>(`/api/sites/${siteId}`, { token }).then((d) => setOn(d.following)).catch(() => {}); }, [token, siteId]);
  const click = async () => {
    if (!token) { router.push("/login?next=" + encodeURIComponent(window.location.pathname)); return; }
    try { await api(`/api/sites/${siteId}/follow`, { token, method: on ? "DELETE" : "POST" }); setOn(!on); toast(on ? t("follow.off") : t("follow.on")); }
    catch (e) { toast((e as Error).message, "error"); }
  };
  return <Button variant={on ? "soft" : "outline"} onClick={click} aria-pressed={on}>{on ? <BellRing className="size-4" /> : <Bell className="size-4" />}{on ? t("follow.following") : t("follow.follow")}</Button>;
}

export function ShareButton({ title, status, path }: { title: string; status: string; path: string }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const text = `${title} — ${status}. ${t("share.text")}`;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch { /* cancelled */ } }
    setOpen(true);
  };
  const copy = async () => { await navigator.clipboard.writeText(url); toast(t("share.copied")); };
  return (
    <>
      <Button variant="outline" onClick={share}><Share2 className="size-4" />{t("share.title")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("share.title")}>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={copy}><Link2 className="size-4" />{t("share.copy")}</Button>
          <Button variant="outline" className="w-full justify-start" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>WhatsApp</Button>
          <Button variant="outline" className="w-full justify-start" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}>X</Button>
          <Button variant="outline" className="w-full justify-start" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>LinkedIn</Button>
        </div>
      </Modal>
    </>
  );
}
