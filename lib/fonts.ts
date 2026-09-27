import { Geist, Geist_Mono, Geist_Pixel } from "next/font/google";

/**
 * Shared Geist font setup, imported by `app/layout.tsx`.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const geistPixel = Geist_Pixel({
  variable: "--font-geist-pixel",
  subsets: ["latin"],
  axes: ["ELSH"],
  display: "swap",
  // Next has no precomputed fallback metrics for Geist Pixel; opting out
  // silences the per-compile warning without changing the emitted CSS.
  adjustFontFallback: false,
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable} ${geistPixel.variable}`;
