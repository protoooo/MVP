import './globals.css'

export const metadata = {
  title: 'ProtocolLM - Food Service Compliance Analysis',
  description: 'Subscription-based image compliance analysis for food service establishments',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
