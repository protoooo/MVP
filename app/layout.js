import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "protocol LM | Food Safety Compliance",
  description: "Professional food safety compliance tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Add this error boundary
function ErrorBoundary({ children }) {
  if (typeof window === 'undefined') return children;
  
  try {
    return children;
  } catch (error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'monospace' }}>
        <h1>App Crashed</h1>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}
