"use client";

import Link from "next/link";
import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import {
  createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Button */
type BtnProps = {
  variant?: "primary" | "navy" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  href?: string;
  loading?: boolean;
  external?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const BTN = {
  primary: "bg-orange text-white hover:bg-orange-dark shadow-sm",
  navy: "bg-navy text-white hover:bg-navy-light shadow-sm",
  outline: "border border-line bg-surface text-ink hover:bg-surface-muted",
  ghost: "text-ink-2 hover:bg-surface-muted hover:text-ink",
  danger: "bg-red text-white hover:opacity-90",
  soft: "bg-orange-soft text-orange-dark hover:brightness-95",
};
const SIZE = { sm: "h-8 px-3 text-[13px] gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-[15px] gap-2" };

export function buttonClass(variant: BtnProps["variant"] = "primary", size: BtnProps["size"] = "md", extra?: string) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-all active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
    BTN[variant], SIZE[size], extra,
  );
}

export function Button({ variant = "primary", size = "md", href, loading, external, className, children, disabled, ...rest }: BtnProps) {
  const cls = buttonClass(variant, size, className);
  if (href) {
    return external || href.startsWith("http") ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
    ) : (
      <Link href={href} className={cls}>{children}</Link>
    );
  }
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- Badge */
const TONE = {
  green: "bg-green-soft text-green", orange: "bg-orange-soft text-orange-dark", red: "bg-red-soft text-red",
  blue: "bg-blue-soft text-blue", amber: "bg-amber-soft text-amber", gray: "bg-surface-muted text-ink-2", navy: "bg-navy text-white",
};
export function Badge({ tone = "gray", className, children, icon }: { tone?: keyof typeof TONE; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[tone], className)}>
      {icon}{children}
    </span>
  );
}

/* ------------------------------------------------------------------ Inputs */
const field = "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20 disabled:opacity-60";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(field, "h-10", className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(field, "min-h-24 py-2.5", className)} {...p} />;
});
export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, "h-10 pr-8", className)} {...p}>{children}</select>;
}
export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink">
      {children}
      {hint && <span className="ml-1.5 font-normal text-ink-3">{hint}</span>}
    </label>
  );
}

/* -------------------------------------------------------------- Skeletons */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-orange", className)} aria-label="Loading" />;
}

/* --------------------------------------------------------- Empty / errors */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-full bg-surface-muted text-ink-2">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-ink-2">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, text, onRetry, retryLabel = "Try again" }: { title: string; text?: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-red/30 bg-red-soft px-6 py-10 text-center">
      <AlertTriangle className="mb-2 size-7 text-red" aria-hidden />
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-ink-2">{text}</p>}
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cn("m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-navy/50 backdrop:backdrop-blur-[2px]", wide ? "max-w-3xl" : "max-w-lg")}
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            {title ? <h2 className="text-lg font-bold">{title}</h2> : <span />}
            <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-2 hover:bg-surface-muted"><X className="size-5" /></button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/* --------------------------------------------------------------------- Tabs */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("no-scrollbar flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("relative shrink-0 px-3.5 py-2.5 text-sm font-semibold transition-colors", value === t.id ? "text-ink" : "text-ink-2 hover:text-ink")}
        >
          {t.label}
          {value === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-orange" />}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- Toast */
type Toast = { id: number; text: string; tone: "ok" | "error" | "info" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((i) => (
          <div key={i.id} className="pointer-events-auto flex max-w-md animate-fade-up items-center gap-2.5 rounded-xl bg-navy px-4 py-3 text-sm text-white shadow-[var(--shadow-float)]">
            {i.tone === "ok" ? <Check className="size-4 shrink-0 text-green" /> : i.tone === "error" ? <AlertTriangle className="size-4 shrink-0 text-orange" /> : <Info className="size-4 shrink-0" />}
            {i.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------------------------------------------------------- Section */
export function SectionTitle({ kicker, title, sub, action }: { kicker?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="kicker mb-1 !text-orange-dark">{kicker}</p>}
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-[15px] text-ink-2">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
