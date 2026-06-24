import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GamepadController } from "@/components/GamepadController";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400","500","600","700","800"], variable: "--font-manrope" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], weight: ["400","500","600","700"], variable: "--font-jetbrains" });

export const metadata: Metadata = { title: "RALLY · Счёт в паделе", description: "Ведение счёта в матче по паделу" };
export const viewport: Viewport = { themeColor: "#0a0b0a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-display antialiased">
        <GamepadController />
        {children}
      </body>
    </html>
  );
}
