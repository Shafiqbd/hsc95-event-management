import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { Emblem } from "@/components/brand";
import { LinkButton } from "@/components/ui/button";
import { EVENT } from "@/config/event";

/** Twinkling sparkles: [left %, top %, size px, delay s, colour var]. */
const SPARKS: [number, number, number, number, string][] = [
  [8, 18, 3, 0, "--gold"],
  [22, 72, 2, 1.1, "--primary"],
  [35, 12, 2, 2.2, "--fg"],
  [48, 84, 3, 0.6, "--violet"],
  [58, 22, 2, 1.7, "--gold"],
  [66, 64, 2, 2.8, "--fg"],
  [78, 10, 3, 0.3, "--primary"],
  [88, 46, 2, 1.4, "--violet"],
  [94, 80, 3, 2.5, "--gold"],
  [14, 48, 2, 3.0, "--fg"],
  [72, 90, 2, 0.9, "--primary"],
  [42, 40, 2, 1.9, "--gold"],
];

/** Chips orbiting the emblem: [label, angle deg, float delay s]. */
const CHIPS: [string, number, number][] = [
  ["৩০ বছর", -90, 0],
  ["পুনর্মিলনী", -25, 0.8],
  ["টিএসসি", 35, 1.6],
  ["৩০ অক্টোবর", 145, 2.4],
  ["'৯৫ ব্যাচ", 210, 3.2],
];

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Glow + star layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="star-field absolute inset-0 opacity-70" />
        <div className="animate-glow-pulse absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_45%,transparent),transparent_65%)] blur-2xl" />
        <div
          className="animate-glow-pulse absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--violet)_42%,transparent),transparent_65%)] blur-2xl"
          style={delay(2.5)}
        />
        <div
          className="animate-glow-pulse absolute bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_26%,transparent),transparent_65%)] blur-2xl"
          style={delay(4.5)}
        />
        {SPARKS.map(([left, top, size, d, color], i) => (
          <span
            key={i}
            className="animate-twinkle absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: `var(${color})`,
              boxShadow: `0 0 ${size * 4}px ${size}px color-mix(in oklab, var(${color}) 70%, transparent)`,
              ...delay(d),
            }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-bg" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div>
          <p
            className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--primary),var(--violet))] px-3 py-1 text-sm font-semibold text-white shadow-[0_6px_24px_-6px_color-mix(in_oklab,var(--violet)_80%,transparent)]"
          >
            <Sparkles className="h-4 w-4" aria-hidden /> {EVENT.celebrationEn}
          </p>
          <h1 className="animate-fade-up mt-5 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl" style={delay(0.1)}>
            <span className="text-shimmer bg-[linear-gradient(90deg,var(--primary),var(--violet),var(--gold),var(--violet),var(--primary))] bg-clip-text text-transparent">
              {EVENT.societyName}
            </span>
            <span className="mt-2 block text-3xl text-fg sm:text-4xl">{EVENT.celebration}</span>
          </h1>
          <ul className="animate-fade-up mt-6 flex flex-wrap gap-3 text-sm" style={delay(0.2)}>
            <li className="inline-flex items-center gap-2 rounded-lg bg-surface/70 px-3 py-2 ring-1 ring-border backdrop-blur">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden /> {EVENT.dateBn}
            </li>
            <li className="inline-flex items-center gap-2 rounded-lg bg-surface/70 px-3 py-2 ring-1 ring-border backdrop-blur">
              <MapPin className="h-4 w-4 text-violet" aria-hidden /> {EVENT.venue}
            </li>
          </ul>
          <p className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted" style={delay(0.3)}>
            {EVENT.welcome}
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3" style={delay(0.4)}>
            <LinkButton href="#registration" size="lg" variant="gold" className="group">
              কীভাবে নিবন্ধন করবেন <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
            </LinkButton>
            <LinkButton href="#event-info" size="lg" variant="secondary">
              ইভেন্ট সম্পর্কে জানুন
            </LinkButton>
          </div>
        </div>

        {/* Emblem inside a glowing, slowly rotating ring with floating chips */}
        <div className="animate-fade-up relative mx-auto aspect-square w-full max-w-[22rem]" style={delay(0.25)}>
          <div
            aria-hidden
            className="animate-glow-pulse absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_70%)] blur-xl"
          />
          <div
            aria-hidden
            className="animate-spin-slow absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--primary),var(--violet),var(--gold),var(--primary))] p-[3px] shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--violet)_80%,transparent)]"
          >
            <div className="h-full w-full rounded-full bg-bg" />
          </div>
          <div className="absolute inset-[9%] flex items-center justify-center rounded-full bg-[#f7f7f7] shadow-[inset_0_0_40px_rgb(0_0_0/0.08)]">
            <Emblem size={190} priority plain />
          </div>
          {CHIPS.map(([label, angle, d]) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <span
                key={label}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${50 + 50 * Math.cos(rad)}%`, top: `${50 + 50 * Math.sin(rad)}%` }}
              >
                <span
                  className="animate-float block whitespace-nowrap rounded-full bg-[linear-gradient(135deg,var(--primary),var(--violet))] px-3 py-1 text-xs font-semibold text-white shadow-[0_6px_20px_-6px_color-mix(in_oklab,var(--violet)_90%,transparent)]"
                  style={delay(d)}
                >
                  {label}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
