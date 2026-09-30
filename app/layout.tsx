import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { ToastProvider } from "@/components/ui";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const deva = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], display: "swap" });

const site = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Kaam Dikhao — Did this actually get built?", template: "%s | Kaam Dikhao" },
  description: "Live map of public works across Indian cities, with satellite history, citizen evidence and RTI tools. Track public spending. See the work. Verify the evidence.",
  applicationName: "Kaam Dikhao",
  openGraph: { title: "Kaam Dikhao — Did this actually get built?", description: "Track public spending. See the work. Verify the evidence.", type: "website", locale: "en_IN", siteName: "Kaam Dikhao" },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#08243a", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${inter.variable} ${deva.variable}`}>
      <body className="min-h-screen">
        <ClerkProvider>
          <I18nProvider lang={lang}>
          <AuthProvider>
          <ToastProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <MobileNav />
          </ToastProvider>
          </AuthProvider>
          </I18nProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}