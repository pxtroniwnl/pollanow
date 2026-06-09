import type { Metadata, Viewport } from "next";
import { Anton, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PollaNow · Mundial 2026",
  description: "La polla de la fase de grupos del Mundial 2026 entre amigos.",
};

export const viewport: Viewport = {
  themeColor: "#03100a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body className="relative">
        <div className="relative z-[2] mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-12">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
