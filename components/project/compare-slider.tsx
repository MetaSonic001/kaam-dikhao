"use client";

import { useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";

/** Draggable before/after comparison. Keyboard accessible (arrow keys on the handle). */
export function CompareSlider({ before, after, beforeLabel, afterLabel, alt, pixelated = true }: {
  before: string; after: string; beforeLabel: string; afterLabel: string; alt: string; pixelated?: boolean;
}) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  const img = `absolute inset-0 size-full object-cover ${pixelated ? "[image-rendering:auto]" : ""}`;
  return (
    <div ref={box} className="relative aspect-square w-full select-none overflow-hidden rounded-xl bg-surface-muted touch-none sm:aspect-[4/3]"
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) move(e.clientX); }}>
      <img src={after} alt={`${alt} — ${afterLabel}`} className={img} draggable={false} />
      <img src={before} alt={`${alt} — ${beforeLabel}`} className={img} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
      <span className="absolute left-2 top-2 rounded-md bg-navy/85 px-2 py-1 text-[11px] font-bold text-white">{beforeLabel}</span>
      <span className="absolute right-2 top-2 rounded-md bg-navy/85 px-2 py-1 text-[11px] font-bold text-white">{afterLabel}</span>
      <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,.5)]" style={{ left: `${pos}%` }}>
        <button role="slider" aria-label="Compare" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
          onKeyDown={(e) => { if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4)); if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4)); }}
          className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-navy shadow-lg"><MoveHorizontal className="size-5" /></button>
      </div>
    </div>
  );
}
