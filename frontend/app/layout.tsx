import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Monican Recharge — Voye Recharge Rapid, Fasil, Kote ou Ye",
  description:
    "Send instant phone credit & data plans to Haiti (Digicel, Natcom) and 150+ countries. Trusted, fast, secure.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Monican Recharge",
    description: "Voye Recharge — Rapid, Fasil, Kote ou Ye",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
          <Toaster position="top-center" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
