import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Slide SaaS - AI 기반 슬라이드 생성 플랫폼",
  description: "URL, PDF, 마크다운을 아름다운 슬라이드로 변환하는 AI 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          defaultThemeId="default"
          defaultMode="system"
          storageKey="slide-saas-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
