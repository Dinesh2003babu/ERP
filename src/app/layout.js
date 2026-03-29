import './globals.css'

export const metadata = {
  title: 'Civil Construction ERP',
  description: 'Manage labor, attendance, and site costs efficiently.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', backgroundColor: '#f8fafc', fontRendering: 'optimizeLegibility' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
