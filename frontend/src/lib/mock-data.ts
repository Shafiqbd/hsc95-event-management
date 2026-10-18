/**
 * STATIC DEMO DATA — used only when NEXT_PUBLIC_API_MODE is not "live".
 * Lets the website, staff login, registration entry, admin screens and token PDFs
 * be tried before the database and API are connected.
 */
import type { Registration, Role } from "@/types/api";

export interface MockUser {
  userId: number;
  fullName: string;
  loginName: string;
  /** Plain text on purpose: demo data only, never used with the real API. */
  password: string;
  email: string;
  contactNumber: string | null;
  role: Role;
}

export interface MockDb {
  version: number;
  users: MockUser[];
  /** entryBy mirrors T_EventForm.EntryBy: the staff user who entered the form. */
  registrations: MockRegistration[];
}

export type MockRegistration = Registration & { entryBy: number };

export const MOCK_DB_VERSION = 3;

export const DEMO_ACCOUNTS: Record<Role, { loginName: string; password: string; label: string }> = {
  admin: { loginName: "admin", password: "admin123", label: "Admin" },
  register: { loginName: "desk", password: "desk123", label: "Register" },
  viewer: { loginName: "viewer", password: "viewer123", label: "Report Viewer" },
};

const pick = (role: Role) => ({ loginName: DEMO_ACCOUNTS[role].loginName, password: DEMO_ACCOUNTS[role].password });

const photo = (n: number) => `/images/demo/member-${((n - 1) % 6) + 1}.svg`;

interface Seed {
  name: string;
  college: string;
  thana: string;
  zila: string;
  work: string;
  blood: string;
  size: string;
  driver?: boolean;
  photo?: boolean;
  active?: boolean;
  passCode?: string;
}

const SEEDS: Seed[] = [
  { name: "রহিম উদ্দিন", college: "ঢাকা কলেজ", thana: "ধানমন্ডি", zila: "ঢাকা", work: "ব্যবসা", blood: "B+", size: "L", driver: true, passCode: "482913" },
  { name: "ফারহানা ইসলাম", college: "হলি ক্রস কলেজ", thana: "তেজগাঁও", zila: "ঢাকা", work: "শিক্ষকতা", blood: "A+", size: "M" },
  { name: "তানভীর হাসান", college: "নটর ডেম কলেজ", thana: "মিরপুর", zila: "ঢাকা", work: "ইঞ্জিনিয়ার", blood: "O+", size: "XL", driver: true },
  { name: "সাবরিনা আক্তার", college: "ভিকারুননিসা নূন কলেজ", thana: "বেইলি রোড", zila: "ঢাকা", work: "চিকিৎসক", blood: "AB+", size: "M" },
  { name: "মোঃ আব্দুল্লাহ আল মামুন চৌধুরী", college: "চট্টগ্রাম কলেজ", thana: "কোতোয়ালী", zila: "চট্টগ্রাম", work: "ব্যাংকার", blood: "B-", size: "XXL" },
  { name: "রাশেদুল করিম", college: "রাজশাহী কলেজ", thana: "বোয়ালিয়া", zila: "রাজশাহী", work: "সরকারি চাকরি", blood: "O-", size: "L" },
  { name: "নুসরাত জাহান", college: "সিলেট এমসি কলেজ", thana: "সিলেট সদর", zila: "সিলেট", work: "আইনজীবী", blood: "A-", size: "M", photo: false },
  { name: "কামরুল হাসান", college: "ঢাকা সিটি কলেজ", thana: "মোহাম্মদপুর", zila: "ঢাকা", work: "সাংবাদিক", blood: "B+", size: "XL", driver: true },
  { name: "শারমিন সুলতানা", college: "ইডেন মহিলা কলেজ", thana: "লালবাগ", zila: "ঢাকা", work: "গৃহিণী", blood: "O+", size: "L" },
  { name: "মাহমুদুল হক", college: "সরকারি বিজ্ঞান কলেজ", thana: "তেজগাঁও", zila: "ঢাকা", work: "ব্যবসা", blood: "A+", size: "XXL", active: false },
  { name: "Mohammad Rafiqul Islam Bhuiyan", college: "Dhaka Residential Model College", thana: "Mohammadpur", zila: "Dhaka", work: "IT Consultant", blood: "AB-", size: "XL" },
  { name: "জান্নাতুল ফেরদৌস", college: "বদরুন্নেসা মহিলা কলেজ", thana: "বকশীবাজার", zila: "ঢাকা", work: "শিক্ষকতা", blood: "B+", size: "M" },
];

const FEE = 1500;
const DRIVER_FEE = 500;

export function createSeedDb(): MockDb {
  const users: MockUser[] = [
    { userId: 1, fullName: "System Administrator", email: "admin@example.com", contactNumber: null, role: "admin", ...pick("admin") },
    { userId: 2, fullName: "Registration Desk 1", email: "desk@example.com", contactNumber: "01700000002", role: "register", ...pick("register") },
    { userId: 3, fullName: "Report Viewer", email: "viewer@example.com", contactNumber: null, role: "viewer", ...pick("viewer") },
  ];

  const registrations = SEEDS.map((seed, i): MockRegistration => {
    const entryId = i + 1;
    const mobileNo = `0171${String(1000000 + entryId * 7351).slice(-7)}`;
    const hasPhoto = seed.photo !== false;
    const isActive = seed.active !== false;
    const day = String(1 + (i % 15)).padStart(2, "0");
    return {
      // Odd entries were keyed in at the Register desk (user 2), the rest by the admin.
      entryBy: entryId % 2 === 1 ? 2 : 1,
      entryId,
      formNo: entryId,
      memberName: seed.name,
      collegeName: seed.college,
      thanaName: seed.thana,
      zilaName: seed.zila,
      workType: seed.work,
      bloodGroup: seed.blood,
      workPlaceAddress: `${seed.thana}, ${seed.zila}`,
      mobileNo,
      facebookId: null,
      tShirtSize: seed.size,
      includeDriver: Boolean(seed.driver),
      amountPaid: FEE + (seed.driver ? DRIVER_FEE : 0),
      paymentStatus: "unverified",
      entryDate: `2026-10-${day} ${String(9 + (i % 9)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00`,
      passCode: seed.passCode ?? null,
      isLocked: false,
      isActive,
      hasPhoto,
      photoUrl: hasPhoto ? photo(entryId) : null,
      tokenReady: isActive,
    };
  });

  return { version: MOCK_DB_VERSION, users, registrations };
}

export const MOCK_FEES = { registrationFee: FEE, driverFee: DRIVER_FEE };
