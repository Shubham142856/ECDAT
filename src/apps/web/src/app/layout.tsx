import "./globals.css";
import React from "react";

export const metadata = {
  title: "ECDAT — Enterprise Cryptographic Discovery & Analysis Tool",
  description: "Evidence-backed cryptographic discovery and migration decision-support platform (SIH26164 · NTRO)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-text antialiased">
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-wider text-primary">ECDAT</span>
            <span className="text-xs px-2 py-0.5 rounded bg-border text-muted-text">SIH26164 · NTRO</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-muted-text">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-safe animate-pulse"></span>
              API CONNECTED
            </span>
          </div>
        </header>
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
