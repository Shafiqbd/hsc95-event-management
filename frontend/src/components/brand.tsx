import Image from "next/image";
import Link from "next/link";
import { EVENT } from "@/config/event";

/** Event emblem, cropped from the supplied registration form artwork. */
export function Emblem({ size = 44, priority = false, plain = false }: { size?: number; priority?: boolean; plain?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${plain ? "" : "rounded-xl bg-[#f7f7f7] p-1 ring-1 ring-black/5"}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/hsc95-emblem.png"
        alt={`${EVENT.societyName} লোগো`}
        width={144}
        height={162}
        priority={priority}
        className="h-full w-auto object-contain"
      />
    </span>
  );
}

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3" aria-label={`${EVENT.societyName} — হোম`}>
      <Emblem />
      <span className="leading-tight">
        <span className="block text-[15px] font-bold text-fg">{EVENT.societyName}</span>
        <span className="block text-xs text-muted">{EVENT.celebration}</span>
      </span>
    </Link>
  );
}
