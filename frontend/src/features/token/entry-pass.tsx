/* eslint-disable @next/next/no-img-element --
   Plain <img> on purpose: photos are session-protected API images and the
   print flow must observe each image's load/decode state before printing. */
import { UserRound } from "lucide-react";
import { formatFormNo } from "@/lib/format";
import type { Registration, TokenData } from "@/types/api";

export function tokenFromRegistration(r: Registration): TokenData {
  return {
    entryId: r.entryId,
    memberName: r.memberName,
    formNo: r.formNo,
    mobileNo: r.mobileNo,
    photoUrl: r.photoUrl,
    collegeName: r.collegeName,
    tShirtSize: r.tShirtSize,
    includeDriver: r.includeDriver,
  };
}

/** Text lines of the info box, top to bottom; shared by the on-screen pass and the PDF. */
export function tokenDetails(token: TokenData) {
  return {
    tokenNo: `টোকেন নং : ${formatFormNo(token.formNo)}`,
    name: token.memberName,
    mobile: `মোবাইল : ${token.mobileNo || "—"}`,
    tShirt: `টি-শার্ট সাইজ : ${token.tShirtSize || "—"}`,
    driver: token.includeDriver ? "With Driver" : null,
  };
}

export const TOKEN_BACKGROUND_SRC = "/images/token-background.jpg";

/**
 * Printed token / paper size in CSS px (96 per inch: 103.45 x 105.57 mm).
 * The 294 x 366 artwork is stretched to this shape; the photo is cover-fitted.
 */
export const TOKEN_W_PX = 391;
export const TOKEN_H_PX = 399;

/**
 * Areas inside the supplied 294 x 366 px artwork, measured from the pixel
 * borders of its boxes (photo box x 75-218 / y 66-208, info box x 19-274 /
 * y 227-301) and expressed as percentages, so they follow the artwork when
 * it is stretched to the token size.
 */
export const TOKEN_GEOMETRY = {
  photo: { left: "25.51%", top: "18.03%", width: "48.98%", height: "39.07%" },
  info: { left: "6.46%", top: "62.02%", width: "87.07%", height: "20.49%" },
} as const;
const PHOTO_BOX = TOKEN_GEOMETRY.photo;
const INFO_BOX = TOKEN_GEOMETRY.info;

export function EntryPass({ token }: { token: TokenData }) {
  const d = tokenDetails(token);
  return (
    <div className="entry-pass" data-testid="entry-pass">
      <img
        src={TOKEN_BACKGROUND_SRC}
        alt=""
        aria-hidden
        draggable={false}
        loading="eager"
        className="absolute inset-0 h-full w-full select-none"
      />

      <div className="absolute overflow-hidden bg-[#f3f1fa]" style={PHOTO_BOX}>
        {token.photoUrl ? (
          <img
            src={token.photoUrl}
            alt={`${token.memberName} এর ছবি`}
            loading="eager"
            decoding="sync"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#9c96c4]" aria-label="ছবি নেই">
            <UserRound style={{ width: "40%", height: "40%" }} aria-hidden />
          </div>
        )}
      </div>

      <div
        className="absolute flex flex-col items-center justify-center px-[2cqw] text-center leading-tight text-[#1d1b3a]"
        style={{ ...INFO_BOX, fontSize: d.driver ? "2.85cqw" : "3.5cqw" }}
      >
        <p className="font-semibold text-[#5b3fb0]">{d.tokenNo}</p>
        <p className="w-full truncate font-bold" style={{ fontSize: "1.3em" }}>
          {d.name}
        </p>
        <p>{d.mobile}</p>
        <p>{d.tShirt}</p>
        {d.driver && (
          <p className="mt-[0.4cqw] rounded-md bg-[#15803d] px-[1.5cqw] font-bold text-white">{d.driver}</p>
        )}
      </div>
    </div>
  );
}
