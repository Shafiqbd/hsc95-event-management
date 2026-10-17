import {
  CalendarDays,
  Camera,
  Car,
  ClipboardList,
  IdCard,
  MapPin,
  Printer,
  Shirt,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { Hero } from "@/components/home/hero";
import { PublicShell } from "@/components/layout/public-shell";
import { EVENT } from "@/config/event";
import { formatTaka } from "@/lib/format";

const FACILITIES: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: ClipboardList, title: "রেজিস্ট্রেশন ডেস্ক", description: "কাগজের ফরম জমা দিলে রেজিস্ট্রেশন ডেস্ক থেকে আপনার তথ্য সংরক্ষণ করা হবে।" },
  { icon: Camera, title: "সদস্যের ছবি", description: "প্রবেশ পাসে ব্যবহারের জন্য ফরমের সঙ্গে একটি ছবি দিন।" },
  { icon: Shirt, title: "পোলো টি-শার্ট সাইজ", description: "M, L, XL ও XXL — আপনার মাপের টি-শার্ট সাইজ ফরমে উল্লেখ করুন।" },
  { icon: Ticket, title: "প্রবেশ টোকেন / পাস", description: "ছবি, নাম ও ফরম নম্বরসহ ব্যক্তিগত প্রবেশ পাস।" },
  { icon: Car, title: "ড্রাইভার সুবিধা", description: "সঙ্গে ড্রাইভার থাকলে ফরমে উল্লেখ করুন (অতিরিক্ত ফি প্রযোজ্য)।" },
  { icon: Printer, title: "টোকেন প্রিন্ট", description: "আয়োজকরা সকল সদস্যের প্রবেশ পাস একসাথে প্রিন্ট করে বিতরণ করবেন।" },
];

const STEPS = [
  "নিবন্ধন ফরম পূরণ করে একটি ছবিসহ রেজিস্ট্রেশন ডেস্কে জমা দিন",
  "নির্ধারিত ফি নগদ বা বিকাশ/নগদে পরিশোধ করুন",
  "অনুষ্ঠানের আগে আপনার প্রবেশ টোকেন সংগ্রহ করুন",
];

export default function HomePage() {
  const infoCards = [
    { icon: CalendarDays, label: "তারিখ", value: EVENT.dateBn, accent: "text-primary" },
    { icon: MapPin, label: "স্থান", value: EVENT.venue, accent: "text-violet" },
    { icon: IdCard, label: "রেজিস্ট্রেশন ফি", value: formatTaka(EVENT.displayFees.registration), accent: "text-gold" },
    { icon: Car, label: "ড্রাইভার (ঐচ্ছিক)", value: `+ ${formatTaka(EVENT.displayFees.driver)}`, accent: "text-success" },
  ];

  return (
    <PublicShell>
      <Hero />

      {/* Event information */}
      <section id="event-info" className="scroll-mt-20 border-t border-border/60 bg-bg-soft">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">ইভেন্ট তথ্য</h2>
          <p className="mt-2 text-muted">অনুষ্ঠানের মূল তথ্য এক নজরে।</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {infoCards.map(({ icon: Icon, label, value, accent }) => (
              <div key={label} className="reveal rounded-2xl border border-border bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--primary)_70%,transparent)]">
                <Icon className={`h-7 w-7 ${accent}`} aria-hidden />
                <p className="mt-4 text-sm text-muted">{label}</p>
                <p className="mt-1 text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section id="facilities" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">সুবিধাসমূহ</h2>
          <p className="mt-2 text-muted">নিবন্ধন ও প্রবেশ পাস সংক্রান্ত সুবিধাসমূহ।</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FACILITIES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="reveal group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/50 hover:shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--violet)_70%,transparent)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-violet/20 text-primary transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
              </div>
            ))}
            {EVENT.confirmedFacilities.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gold/40 bg-surface p-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>
          {EVENT.confirmedFacilities.length === 0 && (
            <p className="mt-6 text-sm text-muted">
              খাবার, উপহার বা অন্যান্য আয়োজনের তথ্য আয়োজক কমিটি নিশ্চিত করার পর এখানে জানানো হবে।
            </p>
          )}
        </div>
      </section>

      {/* Registration CTA */}
      <section id="registration" className="scroll-mt-20 px-4 pb-20">
        <div className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-linear-to-br from-primary/20 via-surface to-violet/20 p-8 shadow-soft md:p-12">
          <div aria-hidden className="animate-glow-pulse pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_30%,transparent),transparent_70%)] blur-2xl" />
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-bold">কীভাবে নিবন্ধন করবেন</h2>
              <p className="mt-3 text-muted">
                রেজিস্ট্রেশন ফি {formatTaka(EVENT.displayFees.registration)}। ড্রাইভার সঙ্গে আনলে অতিরিক্ত{" "}
                {formatTaka(EVENT.displayFees.driver)}।
              </p>
              <p className="mt-3 text-muted">নিবন্ধন আয়োজকদের রেজিস্ট্রেশন ডেস্কের মাধ্যমে করা হয়। ফরম সংগ্রহ ও জমার জন্য আয়োজক কমিটির সঙ্গে যোগাযোগ করুন।</p>
            </div>
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={step} className="relative flex items-start gap-3 rounded-xl bg-surface/70 p-4 ring-1 ring-border transition-all duration-300 hover:translate-x-1 hover:ring-primary/50">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
                    {["১", "২", "৩"][i]}
                  </span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
