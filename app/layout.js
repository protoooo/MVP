import './globals.css'

export const metadata = {
  title: 'Inspection Dashboard - Washtenaw County Food Safety',
  description: 'Track and monitor food safety compliance across Washtenaw County establishments',
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
