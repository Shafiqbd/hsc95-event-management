"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Car, CheckCircle2, ChevronDown, ClipboardList, FileDown, Printer, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type DefaultValues } from "react-hook-form";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { fieldAria, FormLine, lineInputClass } from "@/components/ui/form-line";
import { useToast } from "@/components/ui/toast";
import { BLOOD_GROUPS, EVENT, GENDERS, T_SHIRT_SIZES } from "@/config/event";
import { api, errorMessage } from "@/lib/api";
import { formatFormNo, formatTaka } from "@/lib/format";
import { EntryPass } from "@/features/token/entry-pass";
import { usePrintTokens } from "@/features/token/print-sheet";
import { usePdfDownload } from "@/features/token/use-pdf-download";
import type { EventFees, RegistrationResult, TokenData } from "@/types/api";
import { PhotoPicker } from "./photo-picker";
import { registrationSchema, toFormData, type RegistrationInput, type RegistrationValues } from "./schema";

/** Narrower label column in the two-column (tablet+) layout, so every row lines up. */
const LABEL_COL = "md:grid-cols-[6.5rem_1fr]";

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
  collegeName?: string;
  tShirtSize: string;
  includeDriver: boolean;
  photo?: File;
}

/** Paper-form entry used by Register and Admin users. */
export function RegistrationForm() {
  const [fees, setFees] = useState<EventFees>({
    registrationFee: EVENT.displayFees.registration,
    driverFee: EVENT.displayFees.driver,
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const toast = useToast();
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
      setSaved({
        result,
        memberName: values.memberName,
        mobileNo: values.mobileNo,
        collegeName: values.collegeName,
        tShirtSize: values.tShirtSize,
        includeDriver: values.includeDriver,
        photo: values.photo,
      });
      toast.success(
        "নিবন্ধন সম্পন্ন হয়েছে",
        `${values.memberName} · টোকেন নং ${formatFormNo(result.formNo)}${result.sms === "sent" ? " · SMS পাঠানো হয়েছে" : ""}`,
      );
      if (result.sms === "failed") {
        toast.error("SMS পাঠানো যায়নি", "নিবন্ধন সংরক্ষিত হয়েছে, কিন্তু নিশ্চিতকরণ SMS যায়নি।");
      }
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
    <form onSubmit={onSubmit} noValidate className="rounded-md border border-border bg-surface p-5 shadow-soft sm:p-6">
      {/* Compact two-column layout so the whole form fits on a laptop screen; the photo sits on the right. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:gap-8">
        <div className="flex justify-center lg:order-last lg:block">
          <Controller
            control={control}
            name="photo"
            render={({ field }) => <PhotoPicker value={field.value} onChange={field.onChange} error={e.photo?.message} />}
          />
        </div>

        <div className="grid content-start gap-x-8 gap-y-3 md:grid-cols-2">
          <FormLine id="formNo" label="টোকেন নং" error={e.formNo?.message} className={LABEL_COL}>
            <input
              {...register("formNo")}
              {...fieldAria("formNo", e.formNo?.message)}
              placeholder="কাগজের টোকেন নম্বর"
              inputMode="numeric"
              autoFocus
              className={lineInputClass}
            />
          </FormLine>

          <FormLine id="memberName" label="নাম" required error={e.memberName?.message} className={LABEL_COL}>
            <input {...register("memberName")} {...fieldAria("memberName", e.memberName?.message)} placeholder="সদস্যের পুরো নাম" autoComplete="off" className={lineInputClass} />
          </FormLine>

          <fieldset className={`grid gap-1 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-3 ${LABEL_COL}`} aria-describedby={e.gender ? "gender-error" : undefined}>
            <legend className="contents">
              <span className="text-[15px] font-medium">
                লিঙ্গ :<span className="ml-0.5 text-danger" aria-hidden>*</span>
              </span>
            </legend>
            <div>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map((g) => (
                  <label
                    key={g.value}
                    className="flex cursor-pointer items-center justify-center rounded-md border-2 border-border bg-surface-2 px-3 py-1 font-semibold transition-colors hover:border-primary/60 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
                  >
                    <input type="radio" value={g.value} {...register("gender")} className="sr-only" />
                    {g.label}
                  </label>
                ))}
              </div>
              {e.gender && (
                <p id="gender-error" role="alert" className="mt-1 text-sm text-danger">
                  {e.gender.message}
                </p>
              )}
            </div>
          </fieldset>

          <FormLine id="collegeName" label="কলেজ" error={e.collegeName?.message} className={LABEL_COL}>
            <input {...register("collegeName")} {...fieldAria("collegeName", e.collegeName?.message)} placeholder="এইচএসসি পাসের কলেজ" className={lineInputClass} />
          </FormLine>

          <FormLine id="thanaName" label="থানা" error={e.thanaName?.message} className={LABEL_COL}>
            <input {...register("thanaName")} {...fieldAria("thanaName", e.thanaName?.message)} placeholder="থানার নাম" className={lineInputClass} />
          </FormLine>

          <FormLine id="zilaName" label="জেলা" error={e.zilaName?.message} className={LABEL_COL}>
            <input {...register("zilaName")} {...fieldAria("zilaName", e.zilaName?.message)} placeholder="জেলার নাম" className={lineInputClass} />
          </FormLine>

          <FormLine id="workType" label="পেশা" error={e.workType?.message} className={LABEL_COL}>
            <input {...register("workType")} {...fieldAria("workType", e.workType?.message)} placeholder="যেমন: চাকরি, ব্যবসা" autoComplete="organization-title" className={lineInputClass} />
          </FormLine>

          <FormLine id="bloodGroup" label="রক্তের গ্রুপ" error={e.bloodGroup?.message} className={LABEL_COL}>
            <div className="relative">
              <select
                {...register("bloodGroup")}
                {...fieldAria("bloodGroup", e.bloodGroup?.message)}
                className={`${lineInputClass} cursor-pointer appearance-none pr-7 [&_option]:bg-surface [&_option]:text-fg`}
              >
                <option value="">নির্বাচন করুন</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
          </FormLine>

          <FormLine id="mobileNo" label="মোবাইল নং" required error={e.mobileNo?.message} className={LABEL_COL}>
            <input
              {...register("mobileNo")}
              {...fieldAria("mobileNo", e.mobileNo?.message)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              className={lineInputClass}
            />
          </FormLine>

          <FormLine id="facebookId" label="ফেইসবুক আইডি" error={e.facebookId?.message} className={LABEL_COL}>
            <input {...register("facebookId")} {...fieldAria("facebookId", e.facebookId?.message)} placeholder="ফেইসবুক আইডি বা লিংক" className={lineInputClass} />
          </FormLine>

          <FormLine id="workPlaceAddress" label="কর্মস্থলের ঠিকানা" error={e.workPlaceAddress?.message} className={`md:col-span-2 ${LABEL_COL}`}>
            <input {...register("workPlaceAddress")} {...fieldAria("workPlaceAddress", e.workPlaceAddress?.message)} placeholder="অফিস / প্রতিষ্ঠানের ঠিকানা" className={lineInputClass} />
          </FormLine>

          <fieldset
            className={`grid gap-1 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-3 md:col-span-2 ${LABEL_COL}`}
            aria-describedby={e.tShirtSize ? "tShirtSize-error" : undefined}
          >
            <legend className="contents">
              <span className="text-[15px] font-medium">
                পোলো টি-শার্ট সাইজ :<span className="ml-0.5 text-danger" aria-hidden>*</span>
              </span>
            </legend>
            <div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {T_SHIRT_SIZES.map((size) => (
                  <label
                    key={size.value}
                    className="flex cursor-pointer items-baseline justify-center gap-1.5 rounded-md border-2 border-border bg-surface-2 px-2 py-1 transition-colors hover:border-primary/60 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
                  >
                    <input type="radio" value={size.value} {...register("tShirtSize")} className="sr-only" />
                    <span className="font-bold">{size.label}</span>
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

          <div className={`grid gap-1 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-3 ${LABEL_COL}`}>
            <span className="text-[15px] font-medium">ড্রাইভার :</span>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-border bg-surface-2 px-3 py-1 has-checked:border-success has-checked:bg-success/10">
              <input type="checkbox" {...register("includeDriver")} className="h-4 w-4 accent-[var(--success)]" />
              <Car className="h-4 w-4 shrink-0 text-success" aria-hidden />
              <span className="text-sm">
                সঙ্গে ড্রাইভার <span className="text-muted">(+{formatTaka(fees.driverFee)})</span>
              </span>
            </label>
          </div>

          <div className={`grid gap-1 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-3 ${LABEL_COL}`}>
            <span className="text-[15px] font-medium">টাকার পরিমাণ :</span>
            <p className="border-b-2 border-dotted border-border px-2 py-0.5 text-xl font-bold text-gold" aria-live="polite">
              {formatTaka(amount)}
            </p>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="mt-4">
          <Alert tone="danger" title="নিবন্ধন সম্পন্ন হয়নি">
            {serverError}
          </Alert>
        </div>
      )}

      <div className="mt-4 flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          <span className="text-danger">*</span> চিহ্নিত ঘরগুলো পূরণ করা আবশ্যক
        </p>
        <Button type="submit" variant="gold" loading={isSubmitting}>
          {isSubmitting ? "জমা হচ্ছে…" : "নিবন্ধন জমা দিন"}
        </Button>
      </div>
    </form>
  );
}

function RegistrationSuccess({ saved, onNext }: { saved: Saved; onNext: () => void }) {
  const { result } = saved;
  const photoUrl = useMemo(() => (saved.photo ? URL.createObjectURL(saved.photo) : null), [saved.photo]);
  useEffect(() => {
    if (!photoUrl) return;
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);
  const token: TokenData = {
    entryId: result.entryId,
    memberName: saved.memberName,
    formNo: result.formNo,
    mobileNo: saved.mobileNo,
    photoUrl,
    collegeName: saved.collegeName || null,
    tShirtSize: saved.tShirtSize,
    includeDriver: saved.includeDriver,
  };
  const printer = usePrintTokens();
  const pdf = usePdfDownload();

  return (
    <div className="grid gap-6 rounded-md border border-success/40 bg-surface p-6 shadow-soft sm:p-8 lg:grid-cols-[1fr_17rem]">
      <div>
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
        <h1 className="mt-3 text-2xl font-bold">নিবন্ধন সম্পন্ন হয়েছে!</h1>
        <p className="mt-1 text-muted">{saved.memberName} — তথ্য সংরক্ষণ করা হয়েছে।</p>

        <dl className="mt-6 grid max-w-md gap-3">
          <div className="flex justify-between rounded-md bg-surface-2 px-4 py-3">
            <dt className="text-muted">টোকেন নং</dt>
            <dd className="font-bold">{formatFormNo(result.formNo)}</dd>
          </div>
          <div className="flex justify-between rounded-md bg-surface-2 px-4 py-3">
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
        <div className="overflow-hidden rounded-md ring-1 ring-border">
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
