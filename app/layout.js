export const metadata = {
  title: 'Employee Assistant',
  description: 'AI assistant for retail and food service employees',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <style dangerouslySetInnerHTML={{__html: `
          body { background: #0f1419 !important; }
          html { background: #0f1419 !important; }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
