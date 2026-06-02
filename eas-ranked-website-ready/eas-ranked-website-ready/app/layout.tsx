import "./globals.css";
import SoundProvider from "@/components/SoundProvider";
import ToastProvider from "@/components/ToastProvider";
import AnnouncementProvider from "@/components/AnnouncementProvider";
import AnnouncementToast from "@/components/AnnouncementToast";
import { PageTransition } from "@/components/PageTransition";

export const metadata = {
  title: "EAS Arena Dashboard",
  description: "EAS Ranked Dashboard powered by PostgreSQL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "linear-gradient(160deg, #062B45 0%, #073d5c 40%, #064a5e 70%, #052535 100%)", minHeight: "100vh" }}>
        <SoundProvider>
          <ToastProvider>
            <AnnouncementProvider>
              <PageTransition>
                {children}
              </PageTransition>
              <AnnouncementToast />
            </AnnouncementProvider>
          </ToastProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
