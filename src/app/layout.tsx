import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vettcode Engine — Open Source Code Security Scanner",
  description:
    "Professional security and production-readiness analysis for your codebase. Static analysis, targeted AI review, and verified reports — open source.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
