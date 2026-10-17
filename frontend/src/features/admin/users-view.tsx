"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { boxInputClass, fieldAria } from "@/components/ui/form-line";
import { normalizeMobile } from "@/features/registration/schema";
import { useAsync } from "@/hooks/use-async";
import { api, errorMessage } from "@/lib/api";
import type { Role } from "@/types/api";
import { RoleGate, ROLE_LABEL } from "./admin-shell";

export const newUserSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter the full name").max(200),
    loginName: z
      .string()
      .trim()
      .min(3, "At least 3 characters")
      .max(100)
      .regex(/^[A-Za-z0-9._-]+$/, "Letters, digits, '.', '_' and '-' only"),
    email: z.string().trim().pipe(z.email("Enter a valid e-mail address")),
    contactNumber: z
      .string()
      .trim()
      .refine((v) => v === "" || /^01[3-9][0-9]{8}$/.test(normalizeMobile(v)), "11-digit mobile number (01XXXXXXXXX)"),
    role: z.enum(["admin", "register", "viewer"]),
    password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

type NewUserValues = z.infer<typeof newUserSchema>;

const ROLE_HELP: Record<Role, string> = {
  admin: "Everything, including creating users",
  register: "Enters member registrations",
  viewer: "Read-only lists, statistics and token PDFs",
};

export function UsersView() {
  return (
    <RoleGate roles={["admin"]}>
      <UsersContent />
    </RoleGate>
  );
}

function UsersContent() {
  const users = useAsync(() => api.adminUsers());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted">Staff accounts. New users are created with hsc95.sp_insert_user.</p>
      </div>

      <CreateUserForm onCreated={users.reload} />

      {users.error != null && <Alert tone="danger">{errorMessage(users.error)}</Alert>}
      {users.loading && !users.data && <Skeleton className="h-72 w-full" />}
      {users.data && users.data.length === 0 && <EmptyState icon={Users} title="No users yet" />}
      {users.data && users.data.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">ID</th>
                <th scope="col" className="px-4 py-3">Full name</th>
                <th scope="col" className="px-4 py-3">Login name</th>
                <th scope="col" className="px-4 py-3">User type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.data.map((u) => (
                <tr key={u.userId}>
                  <td className="px-4 py-2.5 tabular-nums text-muted">{u.userId}</td>
                  <td className="px-4 py-2.5 font-medium">{u.fullName}</td>
                  <td className="px-4 py-2.5">{u.loginName}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.userTypeName.toLowerCase() === "admin" ? "info" : u.userTypeName.toLowerCase() === "register" ? "gold" : "neutral"}>
                      {u.userTypeName}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewUserValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { fullName: "", loginName: "", email: "", contactNumber: "", role: "register", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await api.createUser({
        fullName: values.fullName,
        loginName: values.loginName,
        email: values.email,
        contactNumber: values.contactNumber ? normalizeMobile(values.contactNumber) : undefined,
        role: values.role,
        password: values.password,
      });
      setMessage({ tone: "success", text: `User "${values.loginName}" created as ${ROLE_LABEL[values.role]}.` });
      reset();
      onCreated();
    } catch (error) {
      setMessage({ tone: "danger", text: errorMessage(error) });
    }
  });

  const field = (
    name: keyof NewUserValues,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="space-y-1">
      <label htmlFor={`new-${name}`} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...register(name)}
        {...fieldAria(`new-${name}`, errors[name]?.message)}
        {...props}
        className={boxInputClass}
      />
      {errors[name] && (
        <p id={`new-${name}-error`} role="alert" className="text-sm text-danger">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <UserPlus className="h-5 w-5 text-primary" aria-hidden /> Create user
      </h2>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {field("fullName", "Full name", { autoComplete: "off" })}
          {field("loginName", "Login name", { autoComplete: "off" })}
          {field("email", "E-mail", { type: "email", autoComplete: "off" })}
          {field("contactNumber", "Contact number (optional)", { type: "tel", placeholder: "01XXXXXXXXX" })}
          {field("password", "Password", { type: "password", autoComplete: "new-password" })}
          {field("confirmPassword", "Repeat password", { type: "password", autoComplete: "new-password" })}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">User type</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(ROLE_HELP) as Role[]).map((role) => (
              <label
                key={role}
                className="cursor-pointer rounded-xl border-2 border-border bg-surface-2 p-3 transition-colors hover:border-primary/60 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input type="radio" value={role} {...register("role")} className="sr-only" />
                <span className="block font-semibold">{ROLE_LABEL[role]}</span>
                <span className="text-xs text-muted">{ROLE_HELP[role]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        <Button type="submit" loading={isSubmitting} icon={<UserPlus className="h-4 w-4" aria-hidden />}>
          Create user
        </Button>
      </form>
    </Card>
  );
}
