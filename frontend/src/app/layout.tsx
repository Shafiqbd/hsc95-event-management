import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { themeInitScript } from "@/components/theme/theme-script";
import { EVENT } from "@/config/event";
import "./globals.css";

// Kalpurush, self-hosted by next/font, so the Bengali font is also available when printing.
// It ships a single Regular weight; bolder text is synthesised by the browser.
const bengali = localFont({
  src: "./fonts/kalpurush.ttf",
  variable: "--font-bengali",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://hsc95society.com:443"),
  title: {
    default: `${EVENT.societyName} — ${EVENT.celebration}`,
    template: `%s | ${EVENT.societyNameEn}`,
  },
  description: `${EVENT.societyNameEn} ${EVENT.celebrationEn} — ${EVENT.venueEn}, ${EVENT.dateBn}. অনলাইন নিবন্ধন ও প্রবেশ টোকেন।`,
  openGraph: {
    title: `${EVENT.societyName} — ${EVENT.celebration}`,
    description: EVENT.welcome,
    images: ["/images/hsc95-emblem.png"],
    locale: "bn_BD",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" data-theme="dark" className={`${bengali.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
