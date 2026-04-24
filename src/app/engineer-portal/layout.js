'use client'

import { HardHat, LogOut, User, DollarSign } from 'lucide-react'

export default function EngineerLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile-Friendly Header */}
      <header style={{ background: 'var(--secondary)', color: 'white', padding: '1rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div className="mobile-header mobile-only" style={{
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0.75rem 1.5rem',
          background: 'var(--secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'white', padding: '0.35rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/favicon.ico" alt="Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
            </div>
            <span style={{ fontWeight: '1000', fontSize: '1.15rem', color: 'white', letterSpacing: '-0.02em' }}>Engineer Portal</span>
          </div>
          <button
            onClick={() => {
              localStorage.clear()
              window.location.href = '/'
            }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem' }}
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1.5rem 1rem' }}>
        {children}
      </main>

      {/* Simple Footer/Copyright */}
      <footer style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
        &copy; {new Date().getFullYear()} Civil Construction ERP. All rights reserved.
      </footer>
    </div>
  )
}
