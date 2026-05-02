import "./globals.css";
import SoundProvider from "@/components/SoundProvider";

export const metadata = {
  title: "EAS Arena Dashboard",
  description: "EAS Ranked Dashboard powered by PostgreSQL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SoundProvider>{children}</SoundProvider>
      </body>
    </html>
  );
}
