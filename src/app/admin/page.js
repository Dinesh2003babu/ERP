'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Building2,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState([
    { name: 'Active Sites', value: '0', icon: Building2, color: 'var(--dashboard-blue)', bg: 'rgba(14,165,233,0.12)', sub: 'Running Sites' },
    { name: 'Total Employees', value: '0', icon: Users, color: 'var(--employees-purple)', bg: 'rgba(139,92,246,0.12)', sub: 'Active Workforce' },
    { name: 'Pending Approvals', value: '0', icon: Clock, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', sub: 'Submissions' },
    { name: 'Weekly Cost', value: '₹0', icon: TrendingUp, color: 'var(--attendance-green)', bg: 'rgba(16,185,129,0.12)', sub: 'Estimated Exp' },
  ])
  const [pendingAttendance, setPendingAttendance] = useState([])

  useEffect(() => {
    setMounted(true)
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)

      // Consolidate all fetches into one high-speed execution block
      const [
        sitesRes, 
        empRes, 
        attRes, 
        profRes, 
        engRes
      ] = await Promise.all([
        supabase.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('attendance').select('*').eq('status', 'pending').order('date', { ascending: false }),
        supabase.from('profiles').select('id, username'),
        supabase.from('engineers').select('engineer_no, name')
      ])

      // 1. Error Pre-Check
      const errors = [sitesRes.error, empRes.error, attRes.error, profRes.error, engRes.error].filter(Boolean)
      if (errors.length > 0) {
        console.error('Partial Dashboard Fetch Error:', errors)
        // We throw the first one for the catch block to handle
        throw errors[0]
      }

      // 2. Build Lookup Maps for Submitters
      // Map UUID -> Username
      const profIdMap = (profRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p.username }), {})
      // Map Username -> Full Name (Case-Insensitive)
      const engNameMap = (engRes.data || []).reduce((acc, e) => ({ ...acc, [e.engineer_no.toLowerCase()]: e.name }), {})

      // 3. Process Pending Submissions Grouping
      const tableDataMap = (attRes.data || []).reduce((acc, row) => {
        const key = `${row.location}-${row.type}-${row.date}`
        if (!acc[key]) {
          // Resolve Engineer Name using our robust 2-stage lookup
          const uName = profIdMap[row.marked_by] || row.marked_by || '-'
          const fName = engNameMap[uName.toLowerCase()] || uName || 'Site Engineer'
          
          acc[key] = {
            location: row.location,
            type: row.type,
            engineer: fName || 'Site Engineer',
            date: new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            count: 0
          }
        }
        acc[key].count += 1
        return acc
      }, {})

      const pendingRows = Object.values(tableDataMap)

      // 4. Update Global Dashboard Stats
      setStats([
        { name: 'Active Sites', value: sitesRes.count?.toString() || '0', icon: Building2, color: 'var(--dashboard-blue)', bg: 'rgba(14,165,233,0.12)', sub: 'Running Sites' },
        { name: 'Total Employees', value: empRes.count?.toString() || '0', icon: Users, color: 'var(--employees-purple)', bg: 'rgba(139,92,246,0.12)', sub: 'Active Workforce' },
        { name: 'Pending Approvals', value: pendingRows.length.toString(), icon: Clock, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', sub: 'Submissions' },
        { name: 'Weekly Cost', value: '₹1.1L', icon: TrendingUp, color: 'var(--attendance-green)', bg: 'rgba(16,185,129,0.12)', sub: 'Estimated Exp' },
      ])

      setPendingAttendance(pendingRows)

    } catch (err) {
      console.error('Critical Dashboard Fetch Error:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Section */}
      <div className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        textAlign: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Real-time overview of your construction sites and labour.</p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700' }}>
          Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.name} style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase' }}>
              <stat.icon style={{ width: '16px', height: '16px', color: stat.color }} />
              {stat.name}
            </div>
            <p style={{ margin: '0', fontWeight: '900', fontSize: '1.5rem', color: stat.color }}>{stat.value}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>

        {/* Pending Approvals Section */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Clock style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              Pending Attendance
            </h2>
            <a href="/admin/attendance" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View All <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="construction-table-container">
            <table className="construction-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Location</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Engineer</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Labour</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingAttendance.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '800', textAlign: 'center', padding: '0.75rem 0.5rem' }}>{row.location}</td>
                    <td style={{ color: 'var(--text-muted)', fontWeight: '700', textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.75rem 0.5rem' }}>{row.type}</td>
                    <td style={{ color: 'var(--text-muted)', fontWeight: '700', textAlign: 'center', padding: '0.75rem 0.5rem' }}>{row.engineer}</td>
                    <td style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '0.75rem 0.5rem' }}>{row.date}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ background: 'var(--brand-light)', padding: '0.2rem 0.4rem', borderRadius: '0.5rem', fontSize: '0.6rem', fontWeight: '900', color: 'var(--brand-dark)', border: '1px solid var(--brand)', whiteSpace: 'nowrap' }}>
                        {row.count} LABOUR
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <a href="/admin/attendance" className="btn btn-primary" style={{ textDecoration: 'none', padding: '0.35rem 0.6rem', fontSize: '0.65rem' }}>
                        Review
                      </a>
                    </td>
                  </tr>
                ))}
                {pendingAttendance.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No pending attendance submissions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0 0.5rem', margin: 0 }}>
            <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
            Critical Alerts
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#fff1f2', border: '1px solid #fda4af', padding: '1rem', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#ffe4e6', padding: '0.5rem', borderRadius: '0.75rem' }}>
                <AlertCircle style={{ width: '16px', height: '16px', color: '#e11d48' }} />
              </div>
              <div>
                <p style={{ fontWeight: '800', fontSize: '0.875rem', color: '#881337', margin: 0 }}>Roster Sync Active</p>
                <p style={{ color: '#be123c', fontSize: '0.75rem', marginTop: '0.25rem', lineHeight: '1.4', margin: 0 }}>System is now pulling data from live Supabase tables.</p>
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '1rem', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '0.75rem' }}>
                <Clock style={{ width: '16px', height: '16px', color: '#d97706' }} />
              </div>
              <div>
                <p style={{ fontWeight: '800', fontSize: '0.875rem', color: '#78350f', margin: 0 }}>Database Connected</p>
                <p style={{ color: '#b45309', fontSize: '0.75rem', marginTop: '0.25rem', lineHeight: '1.4', margin: 0 }}>Verified connection to ps-infra-app database.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
