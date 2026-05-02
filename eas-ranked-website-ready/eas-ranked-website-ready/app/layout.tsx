import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EAS Ranked Dashboard",
  description: "EAS competitive ranked leaderboard and player profiles"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
