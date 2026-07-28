import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AutoCapitalize } from "@/components/AutoCapitalize";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ORAN Rapor Sistemi",
  description: "Haftalık ve Yıllık Faaliyet Raporları Yönetim Sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: '<!-- Yusuf Dalmış hayratıdır:www.linkedin.com/in/yusuf-dalmış -->' }} />
        <AutoCapitalize />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
