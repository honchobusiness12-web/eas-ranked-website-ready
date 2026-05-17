import "./globals.css";
import SoundProvider from "@/components/SoundProvider";
import ToastProvider from "@/components/ToastProvider";
import type { Viewport } from "next";

export const metadata = {
  title: "EAS Arena Dashboard",
  description: "EAS Ranked Dashboard — track CR, ranks, placements, MVPs, and live competitive activity.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#05050b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>
        <SoundProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
