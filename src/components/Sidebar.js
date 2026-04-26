'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  CheckSquare,
  DollarSign,
  FileText,
  LogOut,
  HardHat,
  X,
  Wallet
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, color: 'var(--dashboard-blue)' },
  { name: 'Sites', href: '/admin/sites', icon: Building2, color: 'var(--sites-amber)' },
  { name: 'Employees', href: '/admin/employees', icon: Users, color: 'var(--employees-purple)' },
  { name: 'Engineers', href: '/admin/engineers', icon: HardHat, color: 'var(--reports-indigo)' },
  { name: 'Attendance', href: '/admin/attendance', icon: CheckSquare, color: 'var(--attendance-green)' },
  { name: 'Salary', href: '/admin/salary', icon: DollarSign, color: 'var(--salary-teal)' },
  { name: 'Advances', href: '/admin/advances', icon: Wallet, color: '#f59e0b' },
  { name: 'Reports', href: '/admin/reports', icon: FileText, color: 'var(--reports-indigo)' },
]

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname()

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Logo & Close Button */}
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'white', padding: '0.4rem', borderRadius: '0.9rem', boxShadow: '0 4px 12px rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Logo.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: '900', fontSize: '1.3rem', letterSpacing: '-0.03em', color: 'var(--secondary)' }}>PS Infra</span>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="mobile-only"
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem' }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => {
          const isActive = pathname.replace(/\/$/, '') === item.href.replace(/\/$/, '')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                setIsOpen(false)
                // Force a true page reload if clicking the active tab to clear all deep React state
                if (isActive) {
                  e.preventDefault()
                  window.location.reload()
                }
              }}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{
                '--item-color': item.color,
              }}
            >
              <item.icon className="w-5 h-5" style={{ color: isActive ? 'white' : item.color, flexShrink: 0 }} />
              <span style={{ fontWeight: isActive ? '800' : '600', fontSize: '0.875rem' }}>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div style={{ padding: '1rem', marginTop: 'auto' }}>
        <button
          onClick={() => {
            localStorage.clear()
            window.location.href = '/'
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: 'rgba(244, 63, 94, 0.08)',
            color: '#e11d48',
            border: 'none',
            borderRadius: '1rem',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.875rem'
          }}
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
