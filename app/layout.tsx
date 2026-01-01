import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Workspace",
  description: "Agent-based business workspace that automates daily tasks",
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
