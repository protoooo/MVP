import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Business Workspace - AI-Powered Automation for Small Business",
  description: "Automate your daily business tasks with AI agents. Upload documents, get instant help with finances, HR, customer support, and more.",
  keywords: ["business automation", "AI assistant", "small business", "task automation"],
  openGraph: {
    title: "Business Workspace - AI-Powered Automation",
    description: "Automate your daily business tasks with AI agents",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
