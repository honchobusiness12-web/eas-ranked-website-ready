import "./globals.css";
import "../styles/theme.css";
import SoundProvider from "@/components/SoundProvider";
import ThemeProvider from "@/components/ThemeProvider";
import ToastProvider from "@/components/ToastProvider";

export const metadata = {
  title: "EAS Arena Dashboard",
  description: "EAS Ranked Dashboard powered by PostgreSQL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SoundProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
