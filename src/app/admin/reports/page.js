'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar as CalendarIcon, 
  FileText,
  Building2,
  MapPin,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('weekly')
  const [reportRows, setReportRows] = useState([])
  const [summary, setSummary] = useState({
    totalSalary: 0,
    avgCost: 0,
    otExpenses: 0
  })

  useEffect(() => {
    fetchReportData()
  }, [period])

  async function fetchReportData() {
    try {
      setLoading(true)
      
      // 1. Fetch raw attendance records (confirmed/approved ones)
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .in('status', ['confirmed', 'approved']) // Include both for safety

      if (attError) throw attError

      // 2. Fetch all workers/engineers to resolve pay rates
      const [empRes, engRes] = await Promise.all([
        supabase.from('employees').select('employee_no, pay_rate'),
        supabase.from('engineers').select('engineer_no, pay_rate')
      ])

      // Build pay rate lookup map
      const rateMap = {}
      ;(empRes.data || []).forEach(e => { rateMap[e.employee_no] = e.pay_rate })
      ;(engRes.data || []).forEach(e => { rateMap[e.engineer_no] = e.pay_rate })

      // Aggregate data by location + type
      const aggregated = (attData || []).reduce((acc, row) => {
        const key = `${row.location}-${row.type}`
        if (!acc[key]) {
          acc[key] = {
            location: row.location,
            type: row.type,
            labour: new Set(),
            ot: 0,
            cost: 0
          }
        }
        
        const rate = rateMap[row.employee_no] || 0
        const otRate = (rate / 8) * 1.5 
        
        acc[key].labour.add(row.employee_no)
        acc[key].ot += row.ot_hours || 0
        
        if (row.is_present) {
          acc[key].cost += rate
        }
        acc[key].cost += (row.ot_hours || 0) * otRate
        
        return acc
      }, {})

      const rows = Object.values(aggregated).map(r => ({
        ...r,
        labour: r.labour.size,
        cost: Math.round(r.cost).toLocaleString('en-IN')
      }))

      setReportRows(rows)

      // Calculate Summary
      const total = Object.values(aggregated).reduce((sum, r) => sum + r.cost, 0)
      const totalOT = (attData || []).reduce((sum, row) => {
        const rate = rateMap[row.employee_no] || 0
        const otRate = (rate / 8) * 1.5
        return sum + ((row.ot_hours || 0) * otRate)
      }, 0)

      setSummary({
        totalSalary: total,
        avgCost: rows.length > 0 ? total / rows.length : 0,
        otExpenses: totalOT
      })

    } catch (err) {
      console.error('Report Fetch Error:', err)
      alert('Failed to generate salary & cost reports.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--reports-indigo)', padding: '0.75rem', borderRadius: '1rem', color: 'white' }}>
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>
              Salary & Cost Reports
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.85rem' }}>Site-wise labour cost tracking & financial analysis.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', background: 'white', padding: '0.35rem', borderRadius: '1rem', border: '1px solid var(--border)', width: 'auto' }}>
          {['weekly', 'monthly', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="btn"
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                background: period === p ? 'var(--reports-indigo)' : 'transparent',
                color: period === p ? 'white' : 'var(--text-muted)',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '900'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderTop: '4px solid var(--success)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
          <div>
            <p className="stat-label">Total Salary Payout</p>
            <p className="stat-value">₹{(summary.totalSalary / 1000).toFixed(1)}K</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.5rem', borderRadius: '0.75rem' }}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '4px solid var(--brand)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
          <div>
            <p className="stat-label">Avg. Cost Per Site</p>
            <p className="stat-value">₹{(summary.avgCost / 1000).toFixed(1)}K</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <div style={{ background: 'var(--brand-light)', color: 'var(--brand-dark)', padding: '0.5rem', borderRadius: '0.75rem' }}>
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
          <div>
            <p className="stat-label">OT Expenses</p>
            <p className="stat-value">₹{(summary.otExpenses / 1000).toFixed(1)}K</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.5rem', borderRadius: '0.75rem' }}>
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--primary)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase' }}>
              <MapPin className="w-3.5 h-3.5" />
              <span>Highest Cost Location</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: '0.5rem 0 0 0', color: 'white', lineHeight: '1.2' }}>
              {reportRows.length > 0 ? reportRows.sort((a, b) => parseFloat(b.cost.replace(/,/g,'')) - parseFloat(a.cost.replace(/,/g,'')))[0]?.location : 'N/A'}
            </h2>
          </div>
          <div style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.6rem', fontWeight: '950', padding: '0.15rem 0.6rem', borderRadius: '0.4rem' }}>
            {reportRows.length > 0 ? reportRows.sort((a, b) => parseFloat(b.cost.replace(/,/g,'')) - parseFloat(a.cost.replace(/,/g,'')))[0]?.type.toUpperCase() : 'PROJECT TYPE'}
          </div>
        </div>
      </div>

      {/* Detailed Analysis Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Site-wise Cost Breakdown</h2>
        <div className="construction-table-container">
          <table className="construction-table" style={{ fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.85rem 0.5rem' }}>Location</th>
                <th style={{ padding: '0.85rem 0.5rem' }}>Type</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>Labour</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>OT Hrs</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '800', padding: '0.85rem 0.5rem' }}>{row.location}</td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.85rem 0.5rem' }}>{row.type}</td>
                  <td style={{ fontWeight: '700', padding: '0.85rem 0.5rem', textAlign: 'center' }}>{row.labour}</td>
                  <td style={{ fontWeight: '700', padding: '0.85rem 0.5rem', textAlign: 'center' }}>{row.ot}</td>
                  <td style={{ fontWeight: '900', color: 'var(--secondary)', padding: '0.85rem 0.5rem', textAlign: 'right' }}>₹{row.cost}</td>
                </tr>
              ))}
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No confirmed attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
