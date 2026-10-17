"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Car, CheckCircle2, ClipboardList, FileDown, Info, Printer, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type DefaultValues } from "react-hook-form";
import { Emblem } from "@/components/brand";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { fieldAria, FormLine, lineInputClass } from "@/components/ui/form-line";
import { BLOOD_GROUPS, EVENT, T_SHIRT_SIZES } from "@/config/event";
import { api, errorMessage } from "@/lib/api";
import { formatFormNo, formatTaka, toBnDigits } from "@/lib/format";
import { EntryPass } from "@/features/token/entry-pass";
import { usePrintTokens } from "@/features/token/print-sheet";
import { usePdfDownload } from "@/features/token/use-pdf-download";
import type { EventFees, RegistrationResult, TokenData } from "@/types/api";
import { PhotoPicker } from "./photo-picker";
import { registrationSchema, toFormData, type RegistrationInput, type RegistrationValues } from "./schema";

const DEFAULTS: DefaultValues<RegistrationInput> = {
  formNo: "",
  memberName: "",
  collegeName: "",
  thanaName: "",
  zilaName: "",
  workType: "",
  bloodGroup: "",
  workPlaceAddress: "",
  mobileNo: "",
  facebookId: "",
  includeDriver: false,
};

interface Saved {
  result: RegistrationResult;
  memberName: string;
  mobileNo: string;
  photo: File;
}

/** Paper-form entry used by Register and Admin users. */
export function RegistrationForm() {
  const [fees, setFees] = useState<EventFees>({
    registrationFee: EVENT.displayFees.registration,
    driverFee: EVENT.displayFees.driver,
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const submitting = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput, unknown, RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: DEFAULTS,
    mode: "onTouched",
  });

  // Authoritative fees come from the backend (the amount it will store).
  useEffect(() => {
    let active = true;
    api
      .event()
      .then((value) => active && setFees(value))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const includeDriver = useWatch({ control, name: "includeDriver" });
  const amount = fees.registrationFee + (includeDriver ? fees.driverFee : 0);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await api.register(toFormData(values));
      setSaved({ result, memberName: values.memberName, mobileNo: values.mobileNo, photo: values.photo });
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  // Guards against double submission, including clicks that land before
  // React re-renders the disabled button.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    void submit(event).finally(() => {
      submitting.current = false;
    });
  };

  if (saved) {
    return (
      <RegistrationSuccess
        saved={saved}
        onNext={() => {
          setSaved(null);
          reset(DEFAULTS);
          setTimeout(() => setFocus("formNo"), 0);
        }}
      />
    );
  }

  const e = errors;

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-border bg-surface shadow-soft">
      {/* Header, as on the paper form */}
      <div className="flex flex-col gap-6 border-b border-border p-6 sm:flex-row sm:items-start sm:p-8">
        <div className="flex flex-1 items-start gap-4">
          <Emblem size={84} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">{EVENT.societyName}</h1>
            <p className="text-lg font-semibold text-danger">{EVENT.celebration}</p>
            <p className="mt-1 text-sm text-fg">
              স্থান: {EVENT.venue}। তারিখ: {EVENT.dateBn}
            </p>
            <p className="mt-1 font-semibold text-violet">
              রেজিস্ট্রেশন ফি : {toBnDigits(fees.registrationFee)}/- (ড্রাইভার-{toBnDigits(fees.driverFee)}/-)
            </p>
          </div>
        </div>
        <Controller
          control={control}
          name="photo"
          render={({ field }) => (
            <PhotoPicker value={field.value} onChange={field.onChange} error={e.photo?.message} />
          )}
        />
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        <FormLine
          id="formNo"
          label="ফরম নং"
          error={e.formNo?.message}
          hint="কাগজের ফরমের নম্বর লিখুন। খালি রাখলে পরবর্তী নম্বর স্বয়ংক্রিয়ভাবে দেওয়া হবে।"
        >
          <input
            {...register("formNo")}
            {...fieldAria("formNo", e.formNo?.message, "কাগজের ফরমের নম্বর লিখুন। খালি রাখলে পরবর্তী নম্বর স্বয়ংক্রিয়ভাবে দেওয়া হবে।")}
            inputMode="numeric"
            autoFocus
            className={`${lineInputClass} max-w-40`}
          />
        </FormLine>

        <FormLine id="memberName" label="নাম" required error={e.memberName?.message}>
          <input {...register("memberName")} {...fieldAria("memberName", e.memberName?.message)} autoComplete="off" className={lineInputClass} />
        </FormLine>

        <FormLine id="collegeName" label="কলেজ" error={e.collegeName?.message}>
          <input {...register("collegeName")} {...fieldAria("collegeName", e.collegeName?.message)} className={lineInputClass} />
        </FormLine>

        <div className="grid gap-5 lg:grid-cols-2">
          <FormLine id="thanaName" label="থানা" error={e.thanaName?.message}>
            <input {...register("thanaName")} {...fieldAria("thanaName", e.thanaName?.message)} className={lineInputClass} />
          </FormLine>
          <FormLine id="zilaName" label="জেলা" error={e.zilaName?.message} className="lg:grid-cols-[4rem_1fr]">
            <input {...register("zilaName")} {...fieldAria("zilaName", e.zilaName?.message)} className={lineInputClass} />
          </FormLine>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FormLine id="workType" label="পেশা" error={e.workType?.message}>
            <input {...register("workType")} {...fieldAria("workType", e.workType?.message)} autoComplete="organization-title" className={lineInputClass} />
          </FormLine>
          <FormLine id="bloodGroup" label="রক্তের গ্রুপ" error={e.bloodGroup?.message} className="lg:grid-cols-[7rem_1fr]">
            <select {...register("bloodGroup")} {...fieldAria("bloodGroup", e.bloodGroup?.message)} className={`${lineInputClass} bg-surface`}>
              <option value="">নির্বাচন করুন</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </FormLine>
        </div>

        <FormLine id="workPlaceAddress" label="কর্মস্থলের ঠিকানা" error={e.workPlaceAddress?.message}>
          <textarea {...register("workPlaceAddress")} {...fieldAria("workPlaceAddress", e.workPlaceAddress?.message)} rows={2} className={`${lineInputClass} resize-y`} />
        </FormLine>

        <FormLine id="mobileNo" label="মোবাইল নং" required error={e.mobileNo?.message} hint="একই মোবাইল নম্বরে দুইবার নিবন্ধন করা যাবে না">
          <input
            {...register("mobileNo")}
            {...fieldAria("mobileNo", e.mobileNo?.message, "একই মোবাইল নম্বরে দুইবার নিবন্ধন করা যাবে না")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            className={lineInputClass}
          />
        </FormLine>

        <FormLine id="facebookId" label="ফেইসবুক আইডি" error={e.facebookId?.message}>
          <input {...register("facebookId")} {...fieldAria("facebookId", e.facebookId?.message)} className={lineInputClass} />
        </FormLine>

        <fieldset className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:gap-3" aria-describedby={e.tShirtSize ? "tShirtSize-error" : undefined}>
          <legend className="contents">
            <span className="text-[15px] font-medium">
              পোলো টি-শার্ট সাইজ :<span className="ml-0.5 text-danger" aria-hidden>*</span>
            </span>
          </legend>
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {T_SHIRT_SIZES.map((size) => (
                <label
                  key={size.value}
                  className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-border bg-surface-2 px-3 py-3 transition-colors hover:border-primary/60 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input type="radio" value={size.value} {...register("tShirtSize")} className="sr-only" />
                  <span className="text-lg font-bold">{size.label}</span>
                  <span className="text-xs text-muted">({size.measure})</span>
                </label>
              ))}
            </div>
            {e.tShirtSize && (
              <p id="tShirtSize-error" role="alert" className="mt-1 text-sm text-danger">
                {e.tShirtSize.message}
              </p>
            )}
          </div>
        </fieldset>

        <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:gap-3">
          <span className="text-[15px] font-medium">ড্রাইভার :</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border bg-surface-2 p-3 has-checked:border-success has-checked:bg-success/10">
            <input type="checkbox" {...register("includeDriver")} className="h-5 w-5 accent-[var(--success)]" />
            <Car className="h-5 w-5 text-success" aria-hidden />
            <span>
              সঙ্গে ড্রাইভার থাকবেন <span className="text-muted">(অতিরিক্ত {formatTaka(fees.driverFee)})</span>
            </span>
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:gap-3">
          <span className="text-[15px] font-medium">টাকার পরিমাণ :</span>
          <div>
            <p className="border-b-2 border-dotted border-border px-1 py-2 text-xl font-bold text-gold" aria-live="polite">
              {formatTaka(amount)}
            </p>
            <p className="mt-2 flex gap-2 text-sm text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              নগদ বা বিকাশ/নগদের পেমেন্টের তথ্য সংরক্ষণের ঘর ডাটাবেসে নেই, তাই পেমেন্ট “যাচাই হয়নি” হিসেবে দেখাবে।
            </p>
          </div>
        </div>

        {serverError && (
          <Alert tone="danger" title="নিবন্ধন সম্পন্ন হয়নি">
            {serverError}
          </Alert>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            <span className="text-danger">*</span> চিহ্নিত ঘরগুলো পূরণ করা আবশ্যক
          </p>
          <Button type="submit" size="lg" variant="gold" loading={isSubmitting}>
            {isSubmitting ? "জমা হচ্ছে…" : "নিবন্ধন জমা দিন"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function RegistrationSuccess({ saved, onNext }: { saved: Saved; onNext: () => void }) {
  const { result } = saved;
  const photoUrl = useMemo(() => URL.createObjectURL(saved.photo), [saved.photo]);
  useEffect(() => () => URL.revokeObjectURL(photoUrl), [photoUrl]);
  const token: TokenData = {
    entryId: result.entryId,
    memberName: saved.memberName,
    formNo: result.formNo,
    mobileNo: saved.mobileNo,
    photoUrl,
  };
  const printer = usePrintTokens();
  const pdf = usePdfDownload();

  return (
    <div className="grid gap-6 rounded-2xl border border-success/40 bg-surface p-6 shadow-soft sm:p-8 lg:grid-cols-[1fr_17rem]">
      <div>
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
        <h1 className="mt-3 text-2xl font-bold">নিবন্ধন সম্পন্ন হয়েছে!</h1>
        <p className="mt-1 text-muted">{saved.memberName} — তথ্য সংরক্ষণ করা হয়েছে।</p>

        <dl className="mt-6 grid max-w-md gap-3">
          <div className="flex justify-between rounded-xl bg-surface-2 px-4 py-3">
            <dt className="text-muted">ফরম নং</dt>
            <dd className="font-bold">{formatFormNo(result.formNo)}</dd>
          </div>
          <div className="flex justify-between rounded-xl bg-surface-2 px-4 py-3">
            <dt className="text-muted">টাকার পরিমাণ</dt>
            <dd className="font-bold text-gold">{formatTaka(result.amountPaid)}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="gold" onClick={onNext} icon={<UserPlus className="h-4 w-4" aria-hidden />}>
            পরবর্তী সদস্য নিবন্ধন
          </Button>
          <LinkButton href="/backend/registrations" variant="secondary">
            <ClipboardList className="h-4 w-4" aria-hidden /> সব নিবন্ধন
          </LinkButton>
        </div>
      </div>

      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg ring-1 ring-border">
          <EntryPass token={token} />
        </div>
        <Button
          className="w-full"
          variant="primary"
          size="sm"
          loading={printer.busy}
          onClick={() => printer.print([token])}
          icon={<Printer className="h-4 w-4" aria-hidden />}
        >
          টোকেন প্রিন্ট
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          size="sm"
          loading={pdf.busy}
          onClick={() => pdf.download([token], `token-${result.formNo}.pdf`)}
          icon={<FileDown className="h-4 w-4" aria-hidden />}
        >
          PDF ডাউনলোড
        </Button>
        {pdf.error && <Alert tone="danger">{pdf.error}</Alert>}
      </div>
      {printer.portal}
    </div>
  );
}
