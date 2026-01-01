import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "naiborhood - Business Automation Platform",
  description: "Multi-agent automation platform for small businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
