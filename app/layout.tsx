import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/Toast";

export const metadata: Metadata = {
  title: "BizMemory - Smart File Storage for Small Business",
  description: "AI-powered file and photo storage with natural language search. Find documents using simple questions like 'show me tax documents from 2018'",
  keywords: ["file storage", "document management", "AI search", "small business", "natural language search"],
  openGraph: {
    title: "BizMemory - Smart File Storage",
    description: "AI-powered file and photo storage with natural language search",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
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
