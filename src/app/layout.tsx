import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentProfile } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VivoLearn | Medeniyet Üniversitesi Dijital Öğrenme Platformu",
  description:
    "VivoLearn ile teorik dersleri takip edin, uygulama derslerine hazırlanın ve üniversite programlarını keşfedin.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased text-slate-900">
        <SiteHeader profile={profile} />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
