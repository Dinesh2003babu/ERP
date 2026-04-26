'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { Menu, HardHat } from 'lucide-react'

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isSidebarOpen])

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header mobile-only" style={{
        background: 'white',
        boxShadow: '0 4px 12px rgba(14,165,233,0.1)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        color: 'var(--secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'white', padding: '0.35rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Logo.png" alt="Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: '1000', fontSize: '1.15rem', color: 'var(--secondary)', letterSpacing: '-0.02em' }}>PS Infra</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{ background: 'rgba(14,165,233,0.1)', border: 'none', color: 'var(--brand)', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem' }}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="main-content">
        {children}
      </div>
    </div>
  )
}
