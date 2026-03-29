'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Plus,
  Phone,
  CreditCard,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Clock,
  TrendingUp,
  IndianRupee,
  ArrowLeft,
  Briefcase,
  IdCard
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function EmployeesPage() {
  // View Constants
  const VIEW_ROSTER = 'ROSTER'
  const VIEW_PROFILE = 'PROFILE'

  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')

  // Navigation & Profile State
  const [view, setView] = useState(VIEW_ROSTER)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showPersonal, setShowPersonal] = useState(false)

  // Analytics State
  const [empAttendance, setEmpAttendance] = useState([])
  const [empLoading, setEmpLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  // Helper Functions
  const getToday = () => new Date().toISOString().split('T')[0]
  const fmtINR = (num) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num || 0)
  const getInitial = (name) => name?.charAt(0).toUpperCase() || '?'

  const fmtDay = (dateStr) => {
    const d = new Date(dateStr)
    return {
      day: d.getDate(),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
      month: d.toLocaleDateString('en-IN', { month: 'short' })
    }
  }

  const computeStats = (data, emp) => {
    if (!emp || !data) return { presentDays: 0, totalOT: 0, pct: 0, amount: 0 }
    
    // Only count active/pending records
    const valid = data.filter(r => r.status === 'confirmed' || r.status === 'pending' || r.status === 'approved')
    const present = valid.filter(r => r.is_present)
    const totalOT = valid.reduce((sum, r) => sum + (r.ot_hours || 0), 0)
    
    const rate = emp.pay_rate || 0
    const otRate = rate / 8
    const earned = (present.length * rate) + (totalOT * otRate)

    const totalPossible = valid.length || 1
    const pct = Math.round((present.length / totalPossible) * 100)

    return { 
      presentDays: present.length, 
      totalOT, 
      pct, 
      amount: Math.round(earned) 
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('employee_no', { ascending: true })
      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleViewProfile(emp) {
    setSelectedEmployee(emp)
    setView(VIEW_PROFILE)
    setShowPersonal(false)
    await refreshEmployeeAttendance(emp)
  }

  async function refreshEmployeeAttendance(emp) {
    if (!emp) return
    try {
      setEmpLoading(true)
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('employee_no', emp.employee_no)
        .order('date', { ascending: false })
      if (dateFrom) query = query.gte('date', dateFrom)
      if (dateTo) query = query.lte('date', dateTo)
      const { data, error } = await query
      if (error) throw error
      setEmpAttendance(data || [])
    } catch (err) {
      console.error('Analytics Error:', err)
    } finally {
      setEmpLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_no.toLowerCase().includes(search.toLowerCase()) ||
      emp.location.toLowerCase().includes(search.toLowerCase())
    if (activeFilter === 'ALL') return matchesSearch
    return matchesSearch && emp.status?.toUpperCase() === activeFilter
  })

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: ROSTER LIST
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_ROSTER) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--secondary)', margin: 0, display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <Users style={{ color: 'var(--employees-purple)', width: '32px', height: '32px' }} />
            Employee Roster
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Management of official 10-employee team.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--brand-light)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--brand)', display: 'flex', alignItems: 'center', height: '44px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '950', color: 'var(--brand-dark)' }}>
                {filteredEmployees.length} EMPLOYEES FOUND
              </span>
            </div>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
              <Plus className="w-5 h-5" />
              <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>ADD EMPLOYEE</span>
            </button>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, ID or site assignment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '3rem', width: '100%', height: '44px' }}
            />
          </div>

          <div style={{ justifyContent: 'center', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.4rem', background: 'white', padding: '0.4rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.7rem',
                    fontWeight: '900',
                    background: activeFilter === f ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: activeFilter === f ? 'white' : 'var(--text-muted)',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredEmployees.map((emp) => (
            <button
              key={emp.employee_no}
              onClick={() => handleViewProfile(emp)}
              style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.15rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1rem', color: 'var(--secondary)', flexShrink: 0 }}>
                {getInitial(emp.name)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 0.1rem', fontWeight: '900', color: 'var(--secondary)', fontSize: '1.05rem' }}>{emp.name}</p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800' }}>{emp.employee_no}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 0.15rem', fontWeight: '900', color: 'var(--success)', fontSize: '0.9rem' }}>₹{fmtINR(emp.pay_rate)}/day</p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                  <Briefcase style={{ width: '11px', height: '11px' }} /> {emp.category}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: EMPLOYEE PROFILE (DEEP-DIVE) - SYNCED WITH ENGINEER PORTAL
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_PROFILE && selectedEmployee) {
    const stats = computeStats(empAttendance, selectedEmployee)

    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header - Ported Style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <button
            onClick={() => setView(VIEW_ROSTER)}
            style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)' }}
          >
            <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)', fontSize: '1.25rem' }}>{selectedEmployee.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase' }}>
              {selectedEmployee.category} • {selectedEmployee.employee_no}
            </p>
          </div>
        </div>

        {/* 1. Personal Identity Dropdown */}
        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <button
            onClick={() => setShowPersonal(!showPersonal)}
            style={{ width: '100%', background: 'none', border: 'none', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CreditCard className="w-5 h-5 text-blue-500" />
              <span style={{ fontWeight: '850', color: 'var(--secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Personal Identity</span>
            </div>
            {showPersonal ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {showPersonal && (
            <div style={{ padding: '0 1.25rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', borderTop: '1px solid var(--border)', background: '#fafafa' }}>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>ID</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IdCard className="w-3.5 h-3.5 text-sky-500" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEmployee.employee_no || '-'}</span>
                </div>
              </div>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>Location</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEmployee.location}</span>
                </div>
              </div>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>Phone</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEmployee.contact_no || '-'}</span>
                </div>
              </div>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>Aadhaar</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEmployee.aadhaar_no || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Dashboard Header */}
        <h4 style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--secondary)', letterSpacing: '0.05em' }}>
          ATTENDANCE & EARNINGS DASHBOARD
        </h4>

        {/* 3. Date Filter Bar */}
        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Row 1: Label + Clear */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays style={{ width: '16px', height: '16px', color: 'var(--brand)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date Range</span>
            </div>
            {dateFrom && (
              <button
                onClick={() => {
                  setDateFrom('')
                  setDateTo(getToday())
                  setTimeout(() => refreshEmployeeAttendance(selectedEmployee), 50)
                }}
                style={{ background: 'rgba(244,63,94,0.08)', color: '#e11d48', border: 'none', borderRadius: '0.6rem', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                ✕ Clear Filter
              </button>
            )}
          </div>
          {/* Row 2: Inputs + Apply */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.45rem 0.6rem', fontSize: '0.8rem', outline: 'none', fontWeight: '700', color: 'var(--secondary)' }}
            />
            <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.8rem', flexShrink: 0 }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.45rem 0.6rem', fontSize: '0.8rem', outline: 'none', fontWeight: '700', color: 'var(--secondary)' }}
            />
            <button
              onClick={() => refreshEmployeeAttendance(selectedEmployee)}
              style={{ background: 'var(--brand)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.5rem 0.9rem', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(14,165,233,0.3)' }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* 4. Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { label: 'WORKED DAYS', icon: <CalendarDays style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />, value: stats.presentDays, sub: 'Present Days', color: '#8b5cf6' },
            { label: 'OT', icon: <Clock style={{ width: '16px', height: '16px', color: '#f59e0b' }} />, value: `${stats.totalOT}h`, sub: 'Overtime Hours', color: '#f59e0b' },
            { label: 'ATTENDANCE', icon: <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--success)' }} />, value: `${stats.pct}%`, sub: 'Attendance Rate', color: 'var(--success)' },
            { label: 'EST. SALARY', icon: <IndianRupee style={{ width: '16px', height: '16px', color: 'var(--brand-dark)' }} />, value: `₹${fmtINR(stats.amount)}`, sub: 'Estimated Salary', color: 'var(--brand-dark)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                {s.icon}{s.label}
              </div>
              <p style={{ margin: '0 0 0.15rem', fontWeight: '900', fontSize: '1.5rem', color: s.color }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* 5. Attendance History */}
        <div style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: '3rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: '#fcfcfc' }}>
            <p style={{ margin: 0, fontWeight: '850', color: 'var(--secondary)', fontSize: '0.9rem' }}>Attendance Report</p>
          </div>
          {empLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="w-7 h-7 animate-spin text-sky-500 mx-auto" /></div>
          ) : empAttendance.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No records found.</div>
          ) : empAttendance.map(row => {
            const d = fmtDay(row.date)
            return (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.95rem', color: 'var(--secondary)', flexShrink: 0 }}>
                  {d.day}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '750', color: 'var(--secondary)', fontSize: '0.9rem' }}>{d.weekday}</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600' }}>{d.month}</p>
                </div>
                {row.ot_hours > 0 && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '850', color: '#f59e0b', background: '#fffbeb', padding: '0.25rem 0.6rem', borderRadius: '0.5rem', border: '1px solid #fef3c7' }}>OT {row.ot_hours}h</span>
                )}
                <span className={`status-pill ${row.is_present ? 'present' : 'absent'}`} style={{ fontSize: '0.62rem', padding: '0.35rem 0.75rem' }}>{row.is_present ? 'Present' : 'Absent'}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
