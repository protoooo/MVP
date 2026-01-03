import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/Toast";

export const metadata: Metadata = {
  title: "ProtocolLM - Unlimited Intelligent Document Storage",
  description: "Store terabytes of documents with powerful semantic search. Find anything instantly using vague wording. Generate summaries across thousands of pages with Cohere.",
  keywords: ["document storage", "semantic search", "unlimited storage", "search", "document retrieval", "Cohere", "Supabase"],
  openGraph: {
    title: "ProtocolLM - Unlimited Intelligent Storage",
    description: "Store unlimited documents. Find anything instantly with semantic search powered by Cohere.",
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
