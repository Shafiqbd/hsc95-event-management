"use client";

import { RegistrationForm } from "@/features/registration/registration-form";
import { RoleGate } from "./admin-shell";

export function NewRegistrationView() {
  return (
    <RoleGate roles={["admin", "register"]}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold">New Registration</h1>
          <p className="text-sm text-muted">Enter the member&apos;s paper form. You are recorded as the person who entered it.</p>
        </div>
        <RegistrationForm />
      </div>
    </RoleGate>
  );
}
