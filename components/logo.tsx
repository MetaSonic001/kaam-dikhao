import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path d="M20 2C11.7 2 5 8.5 5 16.6c0 10.4 11.6 20.4 14.2 22.2a1.4 1.4 0 0 0 1.6 0C23.4 37 35 27 35 16.6 35 8.5 28.3 2 20 2Z" fill="#F97316" />
      <path d="M11.5 22.5h17" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
      <path d="M13.5 19.5 20 10l6.5 9.5" stroke="#08243A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16.7 15.6 2.3 2.4 4.4-4.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Kaam Dikhao home">
      <LogoMark />
      <span className="text-[17px] font-extrabold leading-none tracking-tight">
        <span className={light ? "text-white" : "text-navy"}>KAAM</span>
        <span className="text-orange"> DIKHAO</span>
      </span>
    </Link>
  );
}
