import { Geist, Geist_Mono, Geist_Pixel } from "next/font/google";

/**
 * Shared Geist font setup, imported by `app/layout.tsx`.
 */

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const geistPixel = Geist_Pixel({
  variable: "--font-geist-pixel",
  subsets: ["latin"],
  axes: ["ELSH"],
  display: "swap",
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable} ${geistPixel.variable}`;
