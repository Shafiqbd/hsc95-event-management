import { describe, expect, it } from "vitest";
import { normalizeMobile, registrationSchema, toFormData } from "./schema";

const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "me.jpg", { type: "image/jpeg" });

const valid = {
  formNo: "",
  memberName: "রহিম উদ্দিন",
  mobileNo: "01711111111",
  tShirtSize: "L",
  includeDriver: true,
  photo,
};

const issues = (input: object) => {
  const result = registrationSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
};

describe("registrationSchema", () => {
  it("accepts a valid registration", () => {
    expect(issues(valid)).toEqual([]);
  });

  it("requires name, mobile, t-shirt size and photo", () => {
    expect(issues({ formNo: "", includeDriver: false })).toEqual(
      expect.arrayContaining(["memberName", "mobileNo", "tShirtSize", "photo"]),
    );
  });

  it("accepts an optional paper form number (ASCII or Bengali digits)", () => {
    expect(issues({ ...valid, formNo: "123" })).toEqual([]);
    expect(issues({ ...valid, formNo: "১২৩" })).toEqual([]);
    expect(issues({ ...valid, formNo: "0" })).toContain("formNo");
    expect(issues({ ...valid, formNo: "123456" })).toContain("formNo");
    expect(issues({ ...valid, formNo: "12a" })).toContain("formNo");
  });

  it("validates mobile numbers, including Bengali digits", () => {
    expect(issues({ ...valid, mobileNo: "12345" })).toContain("mobileNo");
    expect(issues({ ...valid, mobileNo: "০১৭১১১১১১১১" })).toEqual([]);
    expect(normalizeMobile("+880 1711-111111")).toBe("01711111111");
  });

  it("only allows supported T-shirt sizes", () => {
    expect(issues({ ...valid, tShirtSize: "S" })).toContain("tShirtSize");
  });

  it("validates photo type and size", () => {
    expect(issues({ ...valid, photo: new File(["x"], "a.gif", { type: "image/gif" }) })).toContain("photo");
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    expect(issues({ ...valid, photo: big })).toContain("photo");
  });

  it("builds multipart data with normalised mobile and form numbers", () => {
    const fd = toFormData(registrationSchema.parse({ ...valid, formNo: "০০৪৫", mobileNo: "০১৭১১-১১১১১১" }));
    expect(fd.get("mobileNo")).toBe("01711111111");
    expect(fd.get("formNo")).toBe("45");
    expect(fd.get("includeDriver")).toBe("true");
    expect(toFormData(registrationSchema.parse(valid)).get("formNo")).toBeNull();
    expect(fd.get("photo")).toBeInstanceOf(File);
  });
});
