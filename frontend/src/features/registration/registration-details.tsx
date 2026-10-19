import { formatEntryDate, formatFormNo, formatTaka } from "@/lib/format";
import { genderLabel, T_SHIRT_SIZES } from "@/config/event";
import type { Registration } from "@/types/api";
import { Badge } from "@/components/ui/feedback";

export function tShirtLabel(size: string): string {
  const match = T_SHIRT_SIZES.find((s) => s.value === size);
  return match ? `${match.label} (${match.measure})` : size;
}

export function StatusBadges({ registration }: { registration: Registration }) {
  return (
    <div className="flex flex-wrap gap-2">
      {registration.isActive ? <Badge tone="success">নিবন্ধন সক্রিয়</Badge> : <Badge tone="danger">নিবন্ধন নিষ্ক্রিয়</Badge>}
      <Badge tone="warning">পেমেন্ট যাচাই হয়নি</Badge>
      {registration.tokenReady ? <Badge tone="info">টোকেন প্রস্তুত</Badge> : <Badge tone="neutral">টোকেন অপেক্ষমান</Badge>}
      {registration.isLocked && <Badge tone="gold">লক করা</Badge>}
    </div>
  );
}

/** Field list shared by the member dashboard and the admin detail panel. */
export function RegistrationDetails({ registration: r }: { registration: Registration }) {
  const rows: [string, string][] = [
    ["টোকেন নং", formatFormNo(r.formNo)],
    ["নাম", r.memberName],
    ["লিঙ্গ", genderLabel(r.gender)],
    ["কলেজ", r.collegeName ?? "—"],
    ["থানা", r.thanaName ?? "—"],
    ["জেলা", r.zilaName ?? "—"],
    ["পেশা", r.workType ?? "—"],
    ["রক্তের গ্রুপ", r.bloodGroup ?? "—"],
    ["কর্মস্থলের ঠিকানা", r.workPlaceAddress ?? "—"],
    ["মোবাইল নং", r.mobileNo ?? "—"],
    ["ফেইসবুক আইডি", r.facebookId ?? "—"],
    ["টি-শার্ট সাইজ", tShirtLabel(r.tShirtSize)],
    ["ড্রাইভার", r.includeDriver ? "হ্যাঁ" : "না"],
    ["SMS পাঠানো হয়েছে", `${r.smsSent} টি`],
    ["টাকার পরিমাণ", formatTaka(r.amountPaid)],
    ["টোকেন নম্বর (পাসকোড)", r.passCode ?? "এখনো দেওয়া হয়নি"],
    ["নিবন্ধনের সময়", formatEntryDate(r.entryDate)],
  ];
  return (
    <dl className="divide-y divide-border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-2.5 text-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="break-words font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
