'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Phone,
  CreditCard,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  HardHat,
  Briefcase,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Clock,
  TrendingUp,
  IndianRupee,
  IdCard,
  FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function EngineersMasterPage() {
  // View Constants
  const VIEW_ROSTER = 'ROSTER'
  const VIEW_PROFILE = 'PROFILE'

  const [loading, setLoading] = useState(true)
  const [engineers, setEngineers] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')

  // Navigation & Profile State
  const [view, setView] = useState(VIEW_ROSTER)
  const [selectedEngineer, setSelectedEngineer] = useState(null)
  const [showPersonal, setShowPersonal] = useState(false)

  // Analytics State
  const [submissions, setSubmissions] = useState([])
  const [subLoading, setSubLoading] = useState(false)
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

  useEffect(() => { fetchEngineers() }, [])

  async function fetchEngineers() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('engineers')
        .select('*')
        .order('engineer_no', { ascending: true })
      if (error) throw error
      setEngineers(data || [])
    } catch (err) {
      console.error('Error fetching engineers:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleViewProfile(eng) {
    setSelectedEngineer(eng)
    setView(VIEW_PROFILE)
    setShowPersonal(false)
    await fetchEngineerActivity(eng)
  }

  async function fetchEngineerActivity(eng) {
    if (!eng) return
    try {
      setSubLoading(true)
      
      // 1. Resolve Engineer's Profile ID to track their submissions
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', eng.engineer_no)
        .single()
      
      if (!profile) {
        setSubmissions([])
        return
      }

      // 2. Fetch attendance records marked by this engineer
      let query = supabase
        .from('attendance')
        .select('id, date, location, type, status')
        .eq('marked_by', profile.id)
        .order('date', { ascending: false })
      
      if (dateFrom) query = query.gte('date', dateFrom)
      query = query.lte('date', dateTo)

      const { data, error } = await query
      if (error) throw error

      // Group by date to count "submissions" (one submission per day/site)
      const grouped = (data || []).reduce((acc, row) => {
        const key = `${row.date}-${row.location}`
        if (!acc[key]) {
          acc[key] = {
            date: row.date,
            location: row.location,
            type: row.type,
            status: row.status,
            entries: 0
          }
        }
        acc[key].entries += 1
        return acc
      }, {})

      setSubmissions(Object.values(grouped))
    } catch (err) {
      console.error('Activity Error:', err)
    } finally {
      setSubLoading(false)
    }
  }

  const filteredEngineers = engineers.filter(eng => {
    const matchesSearch = eng.name.toLowerCase().includes(search.toLowerCase()) ||
      eng.engineer_no.toLowerCase().includes(search.toLowerCase()) ||
      eng.location.toLowerCase().includes(search.toLowerCase())
    if (activeFilter === 'ALL') return matchesSearch
    return matchesSearch && eng.status?.toUpperCase() === activeFilter
  })

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--reports-indigo)' }} />
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
            <HardHat style={{ color: 'var(--reports-indigo)', width: '32px', height: '32px' }} />
            Engineers Master
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Management of official site supervisory staff.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(99,102,241,0.08)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--reports-indigo)', display: 'flex', alignItems: 'center', height: '44px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '950', color: 'var(--reports-indigo)' }}>
                {filteredEngineers.length} ENGINEERS FOUND
              </span>
            </div>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'var(--reports-indigo)', border: 'none' }}>
              <Plus className="w-5 h-5" />
              <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>ADD ENGINEER</span>
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

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.4rem', background: 'white', padding: '0.4rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.7rem',
                    fontWeight: '900',
                    background: activeFilter === f ? 'var(--reports-indigo)' : 'transparent',
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
          {filteredEngineers.map((eng) => (
            <button
              key={eng.engineer_no}
              onClick={() => handleViewProfile(eng)}
              style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.15rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1rem', color: 'var(--reports-indigo)', flexShrink: 0 }}>
                {getInitial(eng.name)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 0.1rem', fontWeight: '900', color: 'var(--secondary)', fontSize: '1.05rem' }}>{eng.name}</p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800' }}>{eng.engineer_no}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 0.15rem', fontWeight: '900', color: 'var(--reports-indigo)', fontSize: '0.9rem' }}>₹{fmtINR(eng.pay_rate)}/mo</p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                  <MapPin style={{ width: '11px', height: '11px', color: 'var(--primary)' }} /> {eng.location}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: ENGINEER PROFILE (DEEP-DIVE)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_PROFILE && selectedEngineer) {

    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <button
            onClick={() => setView(VIEW_ROSTER)}
            style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)' }}
          >
            <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)', fontSize: '1.25rem' }}>{selectedEngineer.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase' }}>
              {selectedEngineer.category} • {selectedEngineer.engineer_no}
            </p>
          </div>
          <span className={`status-pill ${selectedEngineer.status === 'active' ? 'active' : 'inactive'}`} style={{ fontSize: '0.62rem' }}>
            {selectedEngineer.status}
          </span>
        </div>

        {/* 1. Personnel Identity Accordion */}
        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <button
            onClick={() => setShowPersonal(!showPersonal)}
            style={{ width: '100%', background: 'none', border: 'none', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <IdCard className="w-5 h-5 text-indigo-500" />
              <span style={{ fontWeight: '850', color: 'var(--secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Personnel Details</span>
            </div>
            {showPersonal ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {showPersonal && (
            <div style={{ padding: '0 1.25rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', borderTop: '1px solid var(--border)', background: '#fafafa' }}>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>Official ID</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEngineer.engineer_no}</span>
                </div>
              </div>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>Phone</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEngineer.contact_no || '-'}</span>
                </div>
              </div>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>Aadhaar</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEngineer.aadhaar_no || '-'}</span>
                </div>
              </div>
              <div style={{ paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.35rem' }}>Assigned Site</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedEngineer.location}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Management Activity Dashboard Header */}
        <h4 style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--secondary)', letterSpacing: '0.05em' }}>
          Site Management Stats
        </h4>

        {/* 3. Date Filter Bar */}
        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays style={{ width: '16px', height: '16px', color: 'var(--reports-indigo)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Activity Period</span>
            </div>
            {dateFrom && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(getToday()); setTimeout(() => fetchEngineerActivity(selectedEngineer), 50) }}
                style={{ background: 'rgba(244,63,94,0.08)', color: '#e11d48', border: 'none', borderRadius: '0.6rem', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                ✕ Clear
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.45rem 0.6rem', fontSize: '0.8rem', outline: 'none', fontWeight: '700', color: 'var(--secondary)' }} />
            <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.45rem 0.6rem', fontSize: '0.8rem', outline: 'none', fontWeight: '700', color: 'var(--secondary)' }} />
            <button
              onClick={() => fetchEngineerActivity(selectedEngineer)}
              style={{ background: 'var(--reports-indigo)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.5rem 0.9rem', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(99,102,241,0.3)' }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* 4. Management Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { label: 'SITES', icon: <MapPin style={{ width: '16px', height: '16px', color: '#f43f5e' }} />, value: selectedEngineer.location ? 1 : 0, sub: 'Assigned Monitoring', color: '#f43f5e' },
            { label: 'SUBMISSIONS', icon: <FileText style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />, value: submissions.length, sub: 'Logs Marked', color: '#8b5cf6' },
            { label: 'COMPLIANCE', icon: <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--success)' }} />, value: `${submissions.length > 0 ? '100' : '0'}%`, sub: 'Record Accuracy', color: 'var(--success)' },
            { label: 'FIXED PAY', icon: <IndianRupee style={{ width: '16px', height: '16px', color: 'var(--reports-indigo)' }} />, value: `₹${fmtINR(selectedEngineer.pay_rate)}`, sub: 'Monthly Gross', color: 'var(--reports-indigo)' },
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

        {/* 5. Submission History Log */}
        <div style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: '3rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: '#fcfcfc' }}>
            <p style={{ margin: 0, fontWeight: '850', color: 'var(--secondary)', fontSize: '0.9rem' }}>Recent Activity History</p>
          </div>
          {subLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="w-7 h-7 animate-spin text-indigo-500 mx-auto" /></div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No submission records found.</div>
          ) : submissions.map(sub => {
            const d = fmtDay(sub.date)
            return (
              <div key={`${sub.date}-${sub.location}`} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.95rem', color: 'var(--secondary)', flexShrink: 0 }}>
                  {d.day}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '750', color: 'var(--secondary)', fontSize: '0.9rem' }}>{d.weekday}, {d.month}</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600' }}>{sub.entries} Workers Marked at {sub.location}</p>
                </div>
                <span className={`status-pill ${sub.status}`} style={{ fontSize: '0.62rem', padding: '0.35rem 0.75rem' }}>{sub.status}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
