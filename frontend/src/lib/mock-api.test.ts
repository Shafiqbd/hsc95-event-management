import { beforeEach, describe, expect, it } from "vitest";
import { mockApi, resetMockData } from "./mock-api";
import { DEMO_ACCOUNTS } from "./mock-data";
import type { Role } from "@/types/api";

const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "me.jpg", { type: "image/jpeg" });

function registrationForm(mobileNo: string, includeDriver: boolean, formNo?: string) {
  const fd = new FormData();
  if (formNo) fd.append("formNo", formNo);
  fd.append("memberName", "নতুন সদস্য");
  fd.append("mobileNo", mobileNo);
  fd.append("tShirtSize", "XL");
  fd.append("includeDriver", String(includeDriver));
  fd.append("photo", photo);
  return fd;
}

const loginAs = (role: Role) => mockApi.login(DEMO_ACCOUNTS[role].loginName, DEMO_ACCOUNTS[role].password);

describe("demo-mode API", () => {
  beforeEach(() => {
    localStorage.clear();
    resetMockData();
  });

  it("logs in each staff role and rejects bad passwords", async () => {
    await expect(loginAs("admin")).resolves.toMatchObject({ role: "admin" });
    await expect(loginAs("register")).resolves.toMatchObject({ role: "register", userTypeName: "Register" });
    await expect(loginAs("viewer")).resolves.toMatchObject({ role: "viewer", userTypeName: "Report Viewer" });
    await expect(mockApi.login("admin", "wrong")).rejects.toMatchObject({ status: 401 });
  });

  it("requires a session for every staff endpoint", async () => {
    await expect(mockApi.me()).rejects.toMatchObject({ status: 401 });
    await expect(mockApi.adminStats()).rejects.toMatchObject({ status: 401 });
    await loginAs("viewer");
    await mockApi.logout();
    await expect(mockApi.adminRegistrations({ page: 1, pageSize: 5 })).rejects.toMatchObject({ status: 401 });
  });

  it("lets Register enter members with the fee rule and unique form numbers; a mobile may repeat", async () => {
    await loginAs("register");
    const auto = await mockApi.register(registrationForm("01999999999", true));
    expect(auto).toMatchObject({ amountPaid: 2000, formNo: 13 });
    const paper = await mockApi.register(registrationForm("01888888888", false, "500"));
    expect(paper).toMatchObject({ amountPaid: 1500, formNo: 500 });
    await expect(mockApi.register(registrationForm("01999999999", false))).resolves.toMatchObject({ formNo: 501 });
    await expect(mockApi.register(registrationForm("01777777777", false, "500"))).rejects.toMatchObject({ status: 409 });
  });

  it("shows Register users only the members they entered", async () => {
    await loginAs("register");
    const mine = await mockApi.adminRegistrations({ page: 1, pageSize: 50 });
    expect(mine.total).toBe(6); // odd entries were entered by the desk user
    expect(mine.items.every((r) => r.entryId % 2 === 1)).toBe(true);
    expect(mine.items[0]).not.toHaveProperty("entryBy");
    await expect(mockApi.adminRegistration(2)).rejects.toMatchObject({ status: 404 });
    expect((await mockApi.adminStats()).totalRegistrations).toBe(6);
    expect((await mockApi.adminPrintData([1, 2])).map((t) => t.entryId)).toEqual([1]);

    await mockApi.register(registrationForm("01999999999", false));
    expect((await mockApi.adminRegistrations({ page: 1, pageSize: 50 })).total).toBe(7);

    await mockApi.logout();
    await loginAs("viewer");
    expect((await mockApi.adminRegistrations({ page: 1, pageSize: 50 })).total).toBe(13);
  });

  it("keeps Report Viewer read-only and Users admin-only", async () => {
    await loginAs("viewer");
    await expect(mockApi.register(registrationForm("01999999999", true))).rejects.toMatchObject({ status: 403 });
    await expect(mockApi.adminUsers()).rejects.toMatchObject({ status: 403 });
    await expect(mockApi.adminStats()).resolves.toMatchObject({ totalRegistrations: 12 });
    await expect(mockApi.adminPrintData([1, 2])).resolves.toHaveLength(2);
  });

  it("lets Admin create users with unique login names", async () => {
    await loginAs("admin");
    const user = { fullName: "Desk Two", loginName: "desk2", password: "secret123", email: "d@example.com", role: "register" as const };
    await expect(mockApi.createUser(user)).resolves.toMatchObject({ userId: 4 });
    await expect(mockApi.createUser({ ...user, loginName: "DESK2" })).rejects.toMatchObject({ status: 409 });
    await mockApi.logout();
    await expect(mockApi.login("desk2", "secret123")).resolves.toMatchObject({ role: "register" });
  });

  it("gives staff search, paging, stats and complete print data", async () => {
    await loginAs("admin");
    const page1 = await mockApi.adminRegistrations({ page: 1, pageSize: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page1.total).toBe(12);
    expect((await mockApi.adminRegistrations({ search: "রহিম", page: 1, pageSize: 5 })).total).toBe(1);
    // Like the backend: exact form number OR mobile-number substring.
    const byNo = await mockApi.adminRegistrations({ search: "3", page: 1, pageSize: 50 });
    expect(byNo.items.map((r) => r.formNo)).toContain(3);

    const stats = await mockApi.adminStats();
    expect(stats.activeRegistrations).toBe(11);
    expect((await mockApi.adminPrintData()).length).toBe(stats.withPhoto);
    await expect(mockApi.adminRegistration(999)).rejects.toMatchObject({ status: 404 });
  });
});
