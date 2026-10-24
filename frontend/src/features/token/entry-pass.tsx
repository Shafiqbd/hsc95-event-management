/* eslint-disable @next/next/no-img-element --
   Plain <img> on purpose: photos are session-protected API images and the
   print flow must observe each image's load/decode state before printing. */
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

export const TOKEN_BACKGROUND_SRC = "/images/token-background.jpeg";

/** Shown when a member has no photo, or their photo fails to load. */
export const DEFAULT_AVATAR_SRC = "/images/default-avatar.svg";

/**
 * Printed token / paper size in CSS px (96 per inch: 162.46 x 202.94 mm).
 * The 614 x 764 artwork is stretched to this shape; the photo is cover-fitted.
 */
export const TOKEN_W_PX = 614;
export const TOKEN_H_PX = 767;

/**
 * Areas inside the supplied 614 x 764 px artwork, measured from the inner
 * pixel borders of its boxes (photo box x 158-455 / y 138-435, info box
 * x 41-572 / y 534-691) and expressed as percentages, so they follow the
 * artwork when it is stretched to the token size.
 */
export const TOKEN_GEOMETRY = {
  photo: { left: "25.73%", top: "18.06%", width: "48.53%", height: "39.01%" },
  info: { left: "6.68%", top: "69.9%", width: "86.64%", height: "20.68%" },
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
        <img
          src={token.photoUrl || DEFAULT_AVATAR_SRC}
          alt={token.photoUrl ? `${token.memberName} এর ছবি` : "ছবি নেই"}
          loading="eager"
          decoding="sync"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith(DEFAULT_AVATAR_SRC)) img.src = DEFAULT_AVATAR_SRC;
          }}
          className="h-full w-full object-cover object-top"
        />
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
