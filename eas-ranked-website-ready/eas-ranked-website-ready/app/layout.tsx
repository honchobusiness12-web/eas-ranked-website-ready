import "./globals.css";
import SoundProvider from "@/components/SoundProvider";
import ToastProvider from "@/components/ToastProvider";

export const metadata = {
  title: "EAS Ranked",
  description: "Elevate All-Stars Ranked League — Track CR, ranks, placements, and competitive stats.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
