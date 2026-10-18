"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FlaskConical, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { boxInputClass, fieldAria } from "@/components/ui/form-line";
import { api, ApiError, errorMessage, isMockMode } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/mock-data";
import type { Role } from "@/types/api";

export const loginSchema = z.object({
  loginName: z.string().trim().min(1, "লগইন নাম লিখুন"),
  password: z.string().min(1, "পাসওয়ার্ড লিখুন"),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Where each role lands after signing in. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  admin: "/backend/dashboard",
  register: "/backend/registrations/new",
  viewer: "/backend/dashboard",
};

/** One login for all staff (Admin, Register, Report Viewer). */
export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { loginName: "", password: "" } });

  const onSubmit = handleSubmit(async ({ loginName, password }) => {
    setServerError(null);
    try {
      const user = await api.login(loginName, password);
      router.replace(HOME_FOR_ROLE[user.role]);
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 401 ? "লগইন নাম বা পাসওয়ার্ড সঠিক নয়।" : errorMessage(error),
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="loginName" className="text-sm font-medium">
          লগইন নাম
        </label>
        <input
          {...register("loginName")}
          {...fieldAria("loginName", errors.loginName?.message)}
          autoComplete="username"
          className={boxInputClass}
        />
        {errors.loginName && (
          <p id="loginName-error" role="alert" className="text-sm text-danger">
            {errors.loginName.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          পাসওয়ার্ড
        </label>
        <input
          {...register("password")}
          {...fieldAria("password", errors.password?.message)}
          type="password"
          autoComplete="current-password"
          className={boxInputClass}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="text-sm text-danger">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <Button type="submit" className="w-full" loading={isSubmitting} icon={<LogIn className="h-4 w-4" aria-hidden />}>
        লগইন করুন
      </Button>

      {isMockMode && (
        <div className="rounded-md border border-dashed border-gold/50 bg-gold/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-gold">
            <FlaskConical className="h-4 w-4" aria-hidden /> ডেমো মোড — নমুনা অ্যাকাউন্ট
          </p>
          <div className="mt-3 grid gap-2">
            {(Object.keys(DEMO_ACCOUNTS) as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left hover:border-primary/60"
                onClick={() => {
                  setValue("loginName", DEMO_ACCOUNTS[role].loginName, { shouldValidate: true });
                  setValue("password", DEMO_ACCOUNTS[role].password, { shouldValidate: true });
                }}
              >
                <span className="font-semibold">{DEMO_ACCOUNTS[role].label}</span>
                <span className="text-muted">
                  {DEMO_ACCOUNTS[role].loginName} / {DEMO_ACCOUNTS[role].password}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
