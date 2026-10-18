/* eslint-disable @next/next/no-img-element -- local object-URL preview */
"use client";

import { Camera } from "lucide-react";
import { useEffect, useId, useMemo } from "react";

/** The "ছবি" box from the paper form, as an accessible file picker with preview. */
export function PhotoPicker({
  value,
  onChange,
  error,
}: {
  value: File | undefined;
  onChange: (file: File | undefined) => void;
  error?: string;
}) {
  const inputId = useId();
  const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="peer sr-only"
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.files?.[0] ?? undefined)}
      />
      <label
        htmlFor={inputId}
        className={`relative flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border-2 bg-surface-2 text-muted transition-colors hover:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring sm:w-40 ${
          error ? "border-danger" : "border-fg/70"
        }`}
      >
        {preview ? (
          <img src={preview} alt="নির্বাচিত ছবির প্রিভিউ" className="h-full w-full object-cover" />
        ) : (
          <>
            <span className="text-lg font-semibold text-fg">ছবি</span>
            <Camera className="mt-2 h-6 w-6" aria-hidden />
            <span className="mt-1 px-2 text-center text-xs">ছবি নির্বাচন করুন</span>
          </>
        )}
        <span className="sr-only">সদস্যের ছবি (ঐচ্ছিক)</span>
      </label>
      <p className="text-center text-xs text-muted">JPG/PNG/WebP, সর্বোচ্চ ২ MB</p>
      {error && (
        <p role="alert" className="max-w-40 text-center text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
