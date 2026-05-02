import "./globals.css";

export const metadata = {
  title: "EAS Ranked Dashboard",
  description: "Elevate All-Stars Ranked Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
