/* eslint-disable @next/next/no-img-element --
   Plain <img> on purpose: photos are session-protected API images and the
   print flow must observe each image's load/decode state before printing. */
import { UserRound } from "lucide-react";
import { formatFormNo } from "@/lib/format";
import type { Registration, TokenData } from "@/types/api";

export function tokenFromRegistration(r: Registration): TokenData {
  return { entryId: r.entryId, memberName: r.memberName, formNo: r.formNo, mobileNo: r.mobileNo, photoUrl: r.photoUrl };
}

export const TOKEN_BACKGROUND_SRC = "/images/token-background.jpg";

/**
 * Areas inside the supplied 294 x 366 px artwork, measured from the pixel
 * borders of its boxes (photo box x 75-218 / y 66-208, info box x 19-274 /
 * y 227-301) and expressed as percentages so the pass scales without
 * distortion at any size.
 */
export const TOKEN_GEOMETRY = {
  photo: { left: "25.51%", top: "18.03%", width: "48.98%", height: "39.07%" },
  info: { left: "6.46%", top: "62.02%", width: "87.07%", height: "20.49%" },
} as const;
const PHOTO_BOX = TOKEN_GEOMETRY.photo;
const INFO_BOX = TOKEN_GEOMETRY.info;

export function EntryPass({ token }: { token: TokenData }) {
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
        className="absolute flex flex-col items-center justify-center px-[2cqw] text-center"
        style={INFO_BOX}
      >
        <p
          className="line-clamp-2 font-bold leading-[1.15] text-[#1d1b3a]"
          style={{ fontSize: token.memberName.length > 24 ? "5.4cqw" : "6.6cqw" }}
        >
          {token.memberName}
        </p>
        <p className="mt-[1.2cqw] font-semibold text-[#5b3fb0]" style={{ fontSize: "4.8cqw" }}>
          ফরম নং : {formatFormNo(token.formNo)}
        </p>
      </div>
    </div>
  );
}
