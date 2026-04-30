import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Inter, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Toaster } from "sonner";
import { RefSync } from "@/components/RefSync";

/** Chajman dinamik evite erè RSC « not in React Client Manifest » ak PwaClient nan layout. */
const PwaClient = dynamic(() => import("@/components/PwaClient"), { ssr: false });

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/** Métadonnées / OG : jamais d’URL localhost (réseaux sociaux + crawlers). */
const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
const siteUrl =
  rawAppUrl && !/^https?:\/\/localhost(?::\d+)?/i.test(rawAppUrl)
    ? rawAppUrl
    : "https://recharge.monican.shop";

export const metadata: Metadata = {
  title: "Monican Recharge — Voye Recharge Rapid, Fasil, Kote ou Ye",
  description:
    "Send instant phone credit & data plans to Haiti (Digicel, Natcom) and 150+ countries. Trusted, fast, secure.",
  metadataBase: new URL(`${siteUrl}/`),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Recharge",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon-192.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.svg" }],
  },
  openGraph: {
    title: "Monican Recharge",
    description: "Voye Recharge — Rapid, Fasil, Kote ou Ye",
    type: "website",
    url: siteUrl,
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: "Monican Recharge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monican Recharge",
    description: "Voye Recharge — Rapid, Fasil",
    images: [`${siteUrl}/og-image.png`],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ht">
      <body className={`${inter.className} ${inter.variable} ${plusJakarta.variable} ${spaceGrotesk.variable}`}>
        <LanguageProvider>
          <Suspense fallback={null}>
            <RefSync />
          </Suspense>
          {children}
          <PwaClient />
          <Toaster position="top-center" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
