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
      <body className="min-h-screen bg-black text-white font-sans antialiased overflow-x-hidden selection:bg-cyan-500/30 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
