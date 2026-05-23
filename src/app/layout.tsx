import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vettcode Engine — AI Codebase Vetting",
  description:
    "Strict AI-powered security and production-readiness audits for your entire codebase. Powered by OpenRouter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
