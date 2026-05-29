import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Daily Tracker | Your Pink Productivity Companion",
  description:
    "A beautiful pink-themed digital daily productivity tracker. Track tasks, habits, weekly goals, and monthly evaluations — all in one place.",
  keywords: [
    "daily tracker",
    "productivity",
    "habit tracker",
    "task manager",
    "pink theme",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
