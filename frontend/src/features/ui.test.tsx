import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { THEME_STORAGE_KEY, themeInitScript } from "@/components/theme/theme-script";
import { RegistrationsTable } from "@/features/admin/registrations-table";
import { LoginForm } from "@/features/auth/login-form";
import { AdminShell, RoleGate } from "@/features/admin/admin-shell";
import type { Registration, Role } from "@/types/api";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const registration = (over: Partial<Registration> = {}): Registration => ({
  entryId: 1,
  formNo: 7,
  memberName: "রহিম উদ্দিন",
  gender: "M",
  smsSent: 0,
  collegeName: "ঢাকা কলেজ",
  thanaName: null,
  zilaName: null,
  workType: null,
  bloodGroup: "B+",
  workPlaceAddress: null,
  mobileNo: "01711111111",
  facebookId: null,
  tShirtSize: "L",
  includeDriver: true,
  amountPaid: 2000,
  paymentStatus: "unverified",
  entryDate: "2026-10-16 10:00:00",
  passCode: null,
  isLocked: false,
  isActive: true,
  hasPhoto: true,
  photoUrl: "/api/registrations/me/photo",
  tokenReady: true,
  ...over,
});

describe("theme", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.clear();
  });

  it("toggles between dark and light and persists the choice", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: /থিম/ }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    await userEvent.click(screen.getByRole("button", { name: /থিম/ }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("the init script restores a saved theme and ignores junk values", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    new Function(themeInitScript)();
    expect(document.documentElement.dataset.theme).toBe("light");
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_STORAGE_KEY, "<script>");
    new Function(themeInitScript)();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

describe("LoginForm", () => {
  it("shows field validation errors without calling the API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "লগইন করুন" }));
    expect(await screen.findByText("লগইন নাম লিখুন")).toBeInTheDocument();
    expect(screen.getByText("পাসওয়ার্ড লিখুন")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to the staff login endpoint with the CSRF header and shows invalid-credential errors", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(401, { error: { statusCode: 401, message: "Invalid" } }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("লগইন নাম"), "admin");
    await userEvent.type(screen.getByLabelText("পাসওয়ার্ড"), "bad");
    await userEvent.click(screen.getByRole("button", { name: "লগইন করুন" }));

    expect(await screen.findByText("লগইন নাম বা পাসওয়ার্ড সঠিক নয়।")).toBeInTheDocument();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/auth/login");
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("X-Requested-With")).toBe("XMLHttpRequest");
  });
});

describe("staff shell and role gates", () => {
  const meAs = (role: Role, typeName: string) =>
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        data: { userId: 1, fullName: "Staff", loginName: "s", email: "s@x", contactNumber: null, userTypeName: typeName, role },
      }),
    );

  it("shows only the pages a Report Viewer may open and blocks admin-only pages", async () => {
    meAs("viewer", "Report Viewer");
    render(
      <AdminShell>
        <RoleGate roles={["admin"]}>secret users page</RoleGate>
      </AdminShell>,
    );
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByText("secret users page")).not.toBeInTheDocument();
    expect(screen.getAllByText("Registrations").length).toBeGreaterThan(0);
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("New Registration")).not.toBeInTheDocument();
  });

  it("gives Register the New Registration page but not Users", async () => {
    meAs("register", "Register");
    render(
      <AdminShell>
        <RoleGate roles={["admin", "register"]}>registration form</RoleGate>
      </AdminShell>,
    );
    expect(await screen.findByText("registration form")).toBeInTheDocument();
    expect(screen.getAllByText("New Registration").length).toBeGreaterThan(0);
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("gives Admin every page", async () => {
    meAs("admin", "Admin");
    render(
      <AdminShell>
        <RoleGate roles={["admin"]}>users page</RoleGate>
      </AdminShell>,
    );
    expect(await screen.findByText("users page")).toBeInTheDocument();
    expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
  });
});

describe("admin registration table", () => {
  it("lists rows and only lets ready tokens be selected", async () => {
    const toggle = vi.fn();
    const rows = [registration(), registration({ entryId: 2, formNo: 8, memberName: "অপেক্ষমান", tokenReady: false })];
    render(<RegistrationsTable rows={rows} selection={{ selected: new Set(), toggle, togglePage: vi.fn() }} />);

    expect(screen.getByText("০০০৭")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByLabelText("Select token for অপেক্ষমান")).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Select token for রহিম উদ্দিন"));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith(rows[0]));
  });
});
