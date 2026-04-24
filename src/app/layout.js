import './globals.css'

export const metadata = {
  title: 'Civil Construction ERP',
  description: 'Manage labor, attendance, and site costs efficiently.',
  themeColor: '#0ea5e9',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Civil ERP',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
