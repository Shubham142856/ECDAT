import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ECDAT — Enterprise Cryptographic Discovery & Analysis Tool",
  description: "Evidence-backed cryptographic discovery and migration decision-support platform (SIH26164 · NTRO)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-black text-[#f8f7f5] font-sans antialiased overflow-x-hidden selection:bg-[#c8b4a0]/30 selection:text-[#f8f7f5]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
