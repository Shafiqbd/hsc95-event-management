/**
 * In-browser implementation of the API used in demo mode. It mirrors the
 * NestJS endpoints' behaviour (validation results, 401/403/404/409 errors,
 * role checks, amount rules) on top of static data kept in localStorage.
 */
import type { ApiClient } from "./live-api";
import { ApiError } from "./api-error";
import { createSeedDb, DEMO_ACCOUNTS, MOCK_DB_VERSION, MOCK_FEES, type MockDb, type MockRegistration, type MockUser } from "./mock-data";
import type { Registration, Role, SessionUser, TokenData } from "@/types/api";

const DB_KEY = "hsc95-demo-db";
const SESSION_KEY = "hsc95-demo-session";
/** Same name as the real session cookie, so the route proxy behaves the same. */
const SESSION_COOKIE = "hsc95_session";

let memoryDb: MockDb | null = null;

function loadDb(): MockDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(DB_KEY);
    const parsed = raw ? (JSON.parse(raw) as MockDb) : null;
    memoryDb = parsed?.version === MOCK_DB_VERSION ? parsed : createSeedDb();
  } catch {
    memoryDb = createSeedDb();
  }
  return memoryDb;
}

function saveDb(db: MockDb): void {
  memoryDb = db;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Storage full or unavailable: keep the in-memory copy for this tab.
  }
}

/** Restore the original demo data and sign out. */
export function resetMockData(): void {
  memoryDb = null;
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    // ignore
  }
  setSession(null);
}

function setSession(userId: number | null): void {
  try {
    if (userId === null) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, String(userId));
  } catch {
    // ignore
  }
  document.cookie =
    userId === null
      ? `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
      : `${SESSION_COOKIE}=demo-${userId}; path=/; max-age=28800; SameSite=Lax`;
}

function sessionUser(): MockUser {
  let id: number | null = null;
  try {
    id = Number(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    id = null;
  }
  const user = id ? loadDb().users.find((u) => u.userId === id) : undefined;
  if (!user) throw new ApiError(401, "Please sign in");
  return user;
}

function requireRole(...roles: Role[]): MockUser {
  const user = sessionUser();
  if (!roles.includes(user.role)) throw new ApiError(403, "You do not have access to this resource");
  return user;
}

const STAFF: Role[] = ["admin", "register", "viewer"];

/** Same rule as the API: Register users only see forms they entered. */
function visibleRegistrations(user: MockUser): MockRegistration[] {
  const all = loadDb().registrations;
  return user.role === "register" ? all.filter((r) => r.entryBy === user.userId) : all;
}

function publicView(row: MockRegistration): Registration {
  const { entryBy, ...registration } = row;
  void entryBy; // internal link to the staff user; not part of the API shape
  return registration;
}

const toSession = (u: MockUser): SessionUser => ({
  userId: u.userId,
  fullName: u.fullName,
  loginName: u.loginName,
  email: u.email,
  contactNumber: u.contactNumber,
  userTypeName: DEMO_ACCOUNTS[u.role].label,
  role: u.role,
});

const toToken = (r: Registration): TokenData => ({
  entryId: r.entryId,
  memberName: r.memberName,
  formNo: r.formNo,
  mobileNo: r.mobileNo,
  photoUrl: r.photoUrl,
  collegeName: r.collegeName,
  tShirtSize: r.tShirtSize,
  includeDriver: r.includeDriver,
});

/** Small delay so loading states are visible, as with a real network. */
const delay = <T>(value: T, ms = 250) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

function login(loginName: string, password: string): Promise<SessionUser> {
  const user = loadDb().users.find((u) => u.loginName === loginName.trim() && u.password === password);
  if (!user) return Promise.reject(new ApiError(401, "Invalid login name or password"));
  setSession(user.userId);
  return delay(toSession(user));
}

/** Shrink an uploaded photo to a small JPEG data URL so it fits in localStorage. */
async function photoToDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  try {
    const img = new Image();
    img.src = original;
    await img.decode();
    const scale = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return original;
  }
}

const text = (form: FormData, key: string): string | null => {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const mockApi: ApiClient = {
  event: () => delay(MOCK_FEES, 50),

  me: async () => delay(toSession(sessionUser()), 100),
  login: (loginName, password) => login(loginName, password),
  logout: async () => {
    setSession(null);
    return delay({ loggedOut: true as const }, 50);
  },

  register: async (form) => {
    const staff = requireRole("admin", "register");
    const db = loadDb();
    const mobileNo = text(form, "mobileNo") ?? "";
    const requestedFormNo = text(form, "formNo");
    if (requestedFormNo && db.registrations.some((r) => r.formNo === Number(requestedFormNo))) {
      throw new ApiError(409, "This form number is already registered");
    }
    const photoEntry = form.get("photo");
    const photo = photoEntry instanceof File ? photoEntry : null;

    const includeDriver = form.get("includeDriver") === "true";
    const entryId = Math.max(0, ...db.registrations.map((r) => r.entryId)) + 1;
    const formNo = requestedFormNo ? Number(requestedFormNo) : Math.max(0, ...db.registrations.map((r) => r.formNo ?? 0)) + 1;
    const amountPaid = MOCK_FEES.registrationFee + (includeDriver ? MOCK_FEES.driverFee : 0);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    db.registrations.push({
      entryBy: staff.userId,
      entryId,
      formNo,
      memberName: text(form, "memberName") ?? "",
      collegeName: text(form, "collegeName"),
      thanaName: text(form, "thanaName"),
      zilaName: text(form, "zilaName"),
      workType: text(form, "workType"),
      bloodGroup: text(form, "bloodGroup"),
      workPlaceAddress: text(form, "workPlaceAddress"),
      mobileNo,
      facebookId: text(form, "facebookId"),
      tShirtSize: text(form, "tShirtSize") ?? "",
      gender: text(form, "gender") === "F" ? "F" : "M",
      includeDriver,
      smsSent: 0,
      amountPaid,
      paymentStatus: "unverified",
      entryDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`,
      passCode: null,
      isLocked: false,
      isActive: true,
      hasPhoto: photo !== null,
      photoUrl: photo ? await photoToDataUrl(photo) : null,
      tokenReady: true,
    });
    saveDb(db);
    return delay({ entryId, formNo, amountPaid, paymentStatus: "unverified" as const, sms: "skipped" as const }, 600);
  },

  adminStats: async () => {
    const regs = visibleRegistrations(requireRole(...STAFF));
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const sizes = new Map<string, number>();
    for (const r of regs.filter((x) => x.isActive)) sizes.set(r.tShirtSize, (sizes.get(r.tShirtSize) ?? 0) + 1);
    return delay({
      totalRegistrations: regs.length,
      activeRegistrations: regs.filter((r) => r.isActive).length,
      withDriver: regs.filter((r) => r.includeDriver).length,
      totalAmount: regs.reduce((sum, r) => sum + r.amountPaid, 0),
      withPhoto: regs.filter((r) => r.hasPhoto).length,
      tokensReady: regs.filter((r) => r.tokenReady).length,
      withPassCode: regs.filter((r) => r.passCode).length,
      registeredToday: regs.filter((r) => r.entryDate.startsWith(todayKey)).length,
      tShirtSizes: ["L", "M", "XL", "XXL"]
        .filter((s) => sizes.has(s))
        .map((size) => ({ size, total: sizes.get(size) ?? 0 })),
    });
  },

  adminRegistrations: async ({ search, page, pageSize }) => {
    const q = search?.trim().toLowerCase() ?? "";
    const rows = [...visibleRegistrations(requireRole(...STAFF))]
      .reverse()
      .filter(
        (r) =>
          !q || r.memberName.toLowerCase().includes(q) || (r.mobileNo ?? "").includes(q) || String(r.formNo) === q,
      );
    return delay({
      items: rows.slice((page - 1) * pageSize, page * pageSize).map(publicView),
      total: rows.length,
      page,
      pageSize,
    });
  },

  adminRegistration: async (entryId) => {
    const found = visibleRegistrations(requireRole(...STAFF)).find((r) => r.entryId === entryId);
    if (!found) throw new ApiError(404, "Registration not found");
    return delay(publicView(found));
  },

  adminPrintData: async (entryIds) => {
    const regs = visibleRegistrations(requireRole(...STAFF)).filter((r) => r.tokenReady);
    const selected = entryIds && entryIds.length > 0 ? regs.filter((r) => entryIds.includes(r.entryId)) : regs;
    return delay(selected.map((r) => toToken(r)), 400);
  },

  sendTokenSms: async (entryIds) => {
    requireRole("admin");
    const ready = new Set(loadDb().registrations.filter((r) => r.tokenReady).map((r) => r.entryId));
    const failed = entryIds
      .filter((id) => !ready.has(id))
      .map((entryId) => ({ entryId, formNo: null, mobileNo: null, reason: "Not an active registration with a token number" }));
    // Demo mode never contacts the SMS gateway; it only counts the "sent" messages.
    const db = loadDb();
    for (const r of db.registrations) if (entryIds.includes(r.entryId) && ready.has(r.entryId)) r.smsSent += 1;
    saveDb(db);
    return delay({ requested: entryIds.length, sent: entryIds.length - failed.length, failed }, 300 + entryIds.length * 40);
  },

  adminUsers: async () => {
    requireRole("admin");
    return delay(
      loadDb().users.map((u) => ({
        userId: u.userId,
        fullName: u.fullName,
        loginName: u.loginName,
        userTypeName: DEMO_ACCOUNTS[u.role].label,
      })),
    );
  },

  createUser: async (input) => {
    requireRole("admin");
    const db = loadDb();
    if (db.users.some((u) => u.loginName.toLowerCase() === input.loginName.trim().toLowerCase())) {
      throw new ApiError(409, "This login name is already taken");
    }
    const userId = Math.max(...db.users.map((u) => u.userId)) + 1;
    db.users.push({
      userId,
      fullName: input.fullName.trim(),
      loginName: input.loginName.trim(),
      password: input.password,
      email: input.email.trim(),
      contactNumber: input.contactNumber?.trim() || null,
      role: input.role,
    });
    saveDb(db);
    return delay({ userId });
  },
};
