import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin", "latin-ext"], weight: ["300","400","500","600","700","800","900"], variable: "--font-archivo" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-mono" });

export const metadata: Metadata = { title: "RALLY · Счёт в паделе", description: "Ведение счёта в матче по паделу" };
export const viewport: Viewport = { themeColor: "#0a0b0a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${archivo.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-display antialiased">{children}</body>
    </html>
  );
}
