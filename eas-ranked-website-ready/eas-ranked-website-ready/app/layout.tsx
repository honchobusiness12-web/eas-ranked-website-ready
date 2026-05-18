import "./globals.css";
import SoundProvider from "@/components/SoundProvider";
import ToastProvider from "@/components/ToastProvider";
import AnnouncementProvider from "@/components/AnnouncementProvider";
import AnnouncementToast from "@/components/AnnouncementToast";

export const metadata = {
  title: "EAS Arena Dashboard",
  description: "EAS Ranked Dashboard powered by PostgreSQL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SoundProvider>
          <ToastProvider>
            <AnnouncementProvider>
              {children}
              <AnnouncementToast />
            </AnnouncementProvider>
          </ToastProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
