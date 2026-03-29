'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard,
  Download,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SalaryPage() {
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [summary, setSummary] = useState({ total: 0, pending: 0 })

  useEffect(() => {
    fetchSalaryData()
  }, [])

  async function fetchSalaryData() {
    try {
      setLoading(true)
      
      // Fetch both Workers and Engineers
      const [empRes, engRes] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('engineers').select('*')
      ])

      if (empRes.error) throw empRes.error
      if (engRes.error) throw engRes.error

      const allStaff = [
        ...(empRes.data || []).map(e => ({ ...e, isEngineer: false })),
        ...(engRes.data || []).map(e => ({ ...e, isEngineer: true }))
      ]

      setEmployees(allStaff)
      
      const total = allStaff.reduce((sum, e) => sum + (e.pay_rate || 0), 0)
      setSummary({ total, pending: allStaff.length })
    } catch (err) {
      console.error('Salary Fetch Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Indian Numbering System Formatting
  function fmtINR(val) {
    return new Intl.NumberFormat('en-IN').format(val)
  }

  if (loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontWeight: '900', color: 'var(--secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DollarSign style={{ color: 'var(--salary-teal)', width: '32px', height: '32px' }} />
            Salary Management
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor and track workforce compensation (Labour & Engineers).</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--salary-teal)', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}>
          <Download className="w-4 h-4" /> Export Payroll
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <p className="stat-label">Daily Payout</p>
            <p className="stat-value">₹{fmtINR(summary.total)}</p>
          </div>
          <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.75rem', borderRadius: '1rem' }}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Active Payrolls</p>
            <p className="stat-value">{summary.pending}</p>
          </div>
          <div style={{ background: 'var(--brand-light)', color: 'var(--brand)', padding: '0.75rem', borderRadius: '1rem' }}>
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="construction-table-container">
        <table className="construction-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>ID</th>
              <th>Pay Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.employee_no || emp.engineer_no}>
                <td style={{ fontWeight: '800' }}>{emp.name}</td>
                <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {emp.isEngineer ? 'ENGINEER' : (emp.category || emp.role)}
                </td>
                <td style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  {emp.employee_no || emp.engineer_no}
                </td>
                <td style={{ fontWeight: '900' }}>
                  ₹{fmtINR(emp.pay_rate)}{emp.isEngineer ? '' : '/day'}
                </td>
                <td>
                  <span className={`status-pill ${emp.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                    {emp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
