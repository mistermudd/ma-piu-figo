import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Bike, Database } from "lucide-react";

export const metadata: Metadata = {
  title: "DeliveroMatteo - Tracciamento Ordine",
  description: "Tracciamento in tempo reale della consegna con codice di sicurezza",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased min-h-screen flex flex-col font-sans">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#00CDBC] flex items-center justify-center text-white shadow-md shadow-[#00CDBC]/20 group-hover:scale-105 transition-transform">
                <Bike className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-none">
                  Delivero<span className="text-[#00CDBC]">Matteo</span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 tracking-wide mt-0.5">
                  Order & Rider Tracker
                </span>
              </div>
            </Link>

            {/* Database indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
              <Database className="w-3.5 h-3.5 text-[#00CDBC]" />
              <span className="font-medium">PostgreSQL (Neon)</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} DeliveroMatteo. Servizio di consegna e tracciamento in tempo reale.</p>
            <div className="text-slate-400">
              <span>Connesso a Neon PostgreSQL</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
