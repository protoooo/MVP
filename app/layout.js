import './globals.css'

export const metadata = {
  title: 'MI Health Inspection - Food Service Compliance',
  description: 'Help Michigan food service establishments prepare for health inspections with document-grounded compliance analysis',
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
