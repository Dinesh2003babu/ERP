'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Download, Loader2, CalendarDays, Printer, FileSpreadsheet, IndianRupee, Users, Wallet, ArrowLeft, MapPin, ChevronRight, Save, CheckCircle2, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function getToday() { return new Date().toISOString().split('T')[0] }
function getFirstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function fmtDate(s) {
  if (!s) return '-'
  const [y, m, d] = s.split('-')
  return `${d}-${m}-${y}`
}
function fmtINR(val) {
  return new Intl.NumberFormat('en-IN').format(Math.round(val || 0))
}

export default function SalaryPage() {
  const [employees, setEmployees] = useState([])
  const [sites, setSites] = useState([])           // [{ location, type, count }]
  const [selectedSite, setSelectedSite] = useState(null)
  
  // Weekly generation state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [salaryRows, setSalaryRows] = useState([])
  const [generated, setGenerated] = useState(false)
  const [isWeekClosed, setIsWeekClosed] = useState(false)

  // Past periods
  const [pastPeriods, setPastPeriods] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setDateFrom(getFirstOfMonth())
    setDateTo(getToday())
    fetchEmployees()
  }, [])

  async function fetchEmployees() {
    const { data } = await supabase.from('employees').select('*').eq('status', 'active')
    const emps = data || []
    setEmployees(emps)
    // Build unique site list
    const siteMap = {}
    emps.forEach(e => {
      const key = `${e.location}||${e.type}`
      if (!siteMap[key]) siteMap[key] = { location: e.location, type: e.type, count: 0 }
      siteMap[key].count++
    })
    setSites(Object.values(siteMap).sort((a, b) => a.location.localeCompare(b.location)))
  }

  async function fetchPastPeriods(site) {
    // Fetch unique date ranges from salary_records for this site
    const { data } = await supabase
      .from('salary_records')
      .select('date_from, date_to, status')
      .eq('location', site.location)
      .eq('type', site.type)
      .order('date_to', { ascending: false })
      
    // Group by date range
    const ranges = []
    const seen = new Set()
    for (const r of (data || [])) {
      const key = `${r.date_from}_${r.date_to}`
      if (!seen.has(key)) {
        seen.add(key)
        ranges.push({ date_from: r.date_from, date_to: r.date_to, status: r.status })
      }
    }
    setPastPeriods(ranges)
  }

  function handleSelectSite(site) {
    setSelectedSite(site)
    setGenerated(false)
    setSalaryRows([])
    setShowHistory(false)
    fetchPastPeriods(site)
  }

  async function generateReport() {
    if (!dateFrom || !dateTo || !selectedSite) return
    setLoading(true)
    setGenerated(false)
    try {
      const siteEmps = employees.filter(e => e.location === selectedSite.location && e.type === selectedSite.type)

      const [attRes, advRes, pastRes, checkClosedRes] = await Promise.all([
        supabase.from('attendance').select('employee_no, is_present, ot_hours').eq('status', 'approved').eq('location', selectedSite.location).eq('type', selectedSite.type).gte('date', dateFrom).lte('date', dateTo),
        supabase.from('advances').select('employee_no, amount').eq('location', selectedSite.location).eq('type', selectedSite.type).gte('date', dateFrom).lte('date', dateTo),
        supabase.from('salary_records').select('employee_no, net_salary, date_to').eq('location', selectedSite.location).eq('type', selectedSite.type).order('date_to', { ascending: false }),
        supabase.from('salary_records').select('id').eq('location', selectedSite.location).eq('type', selectedSite.type).eq('date_from', dateFrom).eq('date_to', dateTo).limit(1)
      ])

      setIsWeekClosed((checkClosedRes.data || []).length > 0)

      const attMap = {}
      for (const r of (attRes.data || [])) {
        if (!attMap[r.employee_no]) attMap[r.employee_no] = { presentDays: 0, otHours: 0 }
        if (r.is_present) attMap[r.employee_no].presentDays++
        attMap[r.employee_no].otHours += r.ot_hours || 0
      }
      
      const advMap = {}
      for (const r of (advRes.data || [])) advMap[r.employee_no] = (advMap[r.employee_no] || 0) + Number(r.amount)

      const carryMap = {}
      for (const r of (pastRes.data || [])) {
        if (r.date_to < dateFrom && carryMap[r.employee_no] === undefined) {
          carryMap[r.employee_no] = r.net_salary < 0 ? Math.abs(Number(r.net_salary)) : 0
        }
      }

      const rows = siteEmps.map(emp => {
        const payRate = emp.pay_rate || 0
        const presentDays = attMap[emp.employee_no]?.presentDays || 0
        const otHours = attMap[emp.employee_no]?.otHours || 0
        const basicSalary = presentDays * payRate
        const otAmount = otHours * (payRate / 8)
        const grossSalary = basicSalary + otAmount
        
        const advance = advMap[emp.employee_no] || 0
        const carryForward = carryMap[emp.employee_no] || 0
        
        const netSalary = grossSalary - advance - carryForward
        return { ...emp, presentDays, otHours, basicSalary, otAmount, grossSalary, advance, carryForward, netSalary }
      })
      
      rows.sort((a, b) => b.netSalary - a.netSalary)
      setSalaryRows(rows)
      setGenerated(true)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally { setLoading(false) }
  }

  async function closeWeek() {
    if (!salaryRows.length) return
    if (!confirm(`Are you sure you want to CLOSE the week of ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}?\n\nThis will lock the records and save deficits for next week.`)) return
    
    setSaving(true)
    try {
      const records = salaryRows.map(r => ({
        employee_no: r.employee_no,
        employee_name: r.name,
        location: selectedSite.location,
        type: selectedSite.type,
        date_period: dateTo, // Required backward compatibility
        date_from: dateFrom,
        date_to: dateTo,
        present_days: r.presentDays,
        ot_hours: r.otHours,
        basic_salary: r.basicSalary,
        ot_amount: r.otAmount,
        advance_amount: r.advance,
        carry_forward: r.carryForward,
        net_salary: r.netSalary,
        total_earned: r.grossSalary, // For old column compatibility
        status: 'unpaid',
        closed_at: new Date().toISOString()
      }))

      const { error } = await supabase.from('salary_records').insert(records)
      if (error) throw error

      alert('Week successfully closed and saved!')
      setIsWeekClosed(true)
      fetchPastPeriods(selectedSite) // Refresh history
    } catch (err) {
      alert('Error saving week: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function getTotals() {
    return salaryRows.reduce((acc, r) => ({
      presentDays: acc.presentDays + r.presentDays, otHours: acc.otHours + r.otHours,
      basic: acc.basic + r.basicSalary, otAmt: acc.otAmt + r.otAmount,
      gross: acc.gross + r.grossSalary, advance: acc.advance + r.advance, 
      carry: acc.carry + r.carryForward, net: acc.net + r.netSalary
    }), { presentDays: 0, otHours: 0, basic: 0, otAmt: 0, gross: 0, advance: 0, carry: 0, net: 0 })
  }

  function downloadExcel() {
    if (!salaryRows.length) return
    const t = getTotals()
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">
      <tr style="background:#0f172a;color:#fff;font-weight:bold;">
        <th>No</th><th>Name</th><th>ID</th><th>Category</th><th>Days</th><th>OT Hrs</th><th>Basic</th><th>OT Amt</th><th>Gross</th><th>Advance</th><th>Prev Deficit</th><th>Net Pay</th>
      </tr>`
    salaryRows.forEach((r, i) => {
      html += `<tr><td>${i+1}</td><td>${r.name}</td><td>${r.employee_no}</td><td>${r.category||'-'}</td>
        <td style="text-align:center">${r.presentDays}</td><td style="text-align:center">${r.otHours}</td>
        <td style="text-align:right">${fmtINR(r.basicSalary)}</td><td style="text-align:right">${fmtINR(r.otAmount)}</td>
        <td style="text-align:right;font-weight:bold">${fmtINR(r.grossSalary)}</td>
        <td style="text-align:right;color:#dc2626">${fmtINR(r.advance)}</td>
        <td style="text-align:right;color:#d97706">${fmtINR(r.carryForward)}</td>
        <td style="text-align:right;color:${r.netSalary>=0?'#16a34a':'#dc2626'};font-weight:bold">${fmtINR(r.netSalary)}</td></tr>`
    })
    html += `<tr style="background:#f1f5f9;font-weight:bold"><td colspan="4">TOTAL</td>
      <td style="text-align:center">${t.presentDays}</td><td style="text-align:center">${t.otHours}</td>
      <td style="text-align:right">${fmtINR(t.basic)}</td><td style="text-align:right">${fmtINR(t.otAmt)}</td>
      <td style="text-align:right">${fmtINR(t.gross)}</td>
      <td style="text-align:right;color:#dc2626">${fmtINR(t.advance)}</td>
      <td style="text-align:right;color:#d97706">${fmtINR(t.carry)}</td>
      <td style="text-align:right;color:${t.net>=0?'#16a34a':'#dc2626'}">${fmtINR(t.net)}</td></tr>
    </table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Salary_${selectedSite.location}_${dateFrom}_to_${dateTo}.xls`
    link.style.visibility = 'hidden'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const totals = getTotals()

  // ── STEP 1: Site Selection ───────────────────────────────────────────────────
  if (!selectedSite) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontWeight: '900', color: 'var(--secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem' }}>
          <DollarSign style={{ color: 'var(--salary-teal)', width: '32px', height: '32px' }} /> Weekly Accounts & Salary
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>Select a site to generate or view weekly salary reports.</p>
      </div>
      <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MapPin style={{ width: '14px', height: '14px' }} /> Select Site
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {sites.map(site => (
          <button key={`${site.location}-${site.type}`} onClick={() => handleSelectSite(site)}
            style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(13,148,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin style={{ width: '24px', height: '24px', color: 'var(--salary-teal)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.15rem', fontWeight: '900', fontSize: '1rem', color: 'var(--secondary)' }}>{site.location}</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{site.type} • {site.count} workers</p>
            </div>
            <ChevronRight style={{ color: '#94a3b8', flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  )

  // ── STEP 2: Date Range + Report ──────────────────────────────────────────────
  return (
    <>
      <style>{`@media print { @page{size:landscape;margin:10mm} body *{visibility:hidden} .salary-print-area,.salary-print-area *{visibility:visible} .salary-print-area{position:fixed;inset:0;padding:1rem} .no-print{display:none!important} .salary-table th,.salary-table td{font-size:9px!important;padding:5px 6px!important} }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="salary-print-area">

        {/* Header */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSelectedSite(null)}
              style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)' }}>
              <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
            </button>
            <div>
              <h1 style={{ fontWeight: '900', color: 'var(--secondary)', margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <DollarSign style={{ color: 'var(--salary-teal)', width: '28px', height: '28px' }} /> {selectedSite.location}
              </h1>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase' }}>{selectedSite.type} • {selectedSite.count} workers</p>
            </div>
          </div>
          
          {pastPeriods.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} style={{ background: showHistory ? 'var(--secondary)' : 'white', border: showHistory ? '1.5px solid var(--secondary)' : '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: '800', color: showHistory ? 'white' : 'var(--secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}>
              {showHistory ? <CalendarDays style={{ width: '16px', height: '16px' }} /> : <History style={{ width: '16px', height: '16px' }} />}
              {showHistory ? 'Generate New Week' : 'View Past Periods'}
            </button>
          )}
        </div>

        {/* History View */}
        {showHistory ? (
          <div className="no-print" style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 1rem', fontWeight: '900', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 style={{ width: '18px', height: '18px', color: 'var(--attendance-green)' }} /> Past Closed Weeks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pastPeriods.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '0.85rem', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '800', color: 'var(--secondary)' }}>{fmtDate(p.date_from)} <span style={{ color: 'var(--text-muted)' }}>to</span> {fmtDate(p.date_to)}</p>
                  </div>
                  <button onClick={() => { setDateFrom(p.date_from); setDateTo(p.date_to); setShowHistory(false); generateReport() }}
                    style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    View Report <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Date Range + Generate */}
            <div className="no-print" style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays style={{ width: '16px', height: '16px', color: 'var(--brand)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pay Period</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    style={{ flex: 1, minWidth: '0', border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--secondary)', outline: 'none' }} />
                  <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>→</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    style={{ flex: 1, minWidth: '0', border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--secondary)', outline: 'none' }} />
                </div>
                <button onClick={generateReport} disabled={loading}
                  style={{ background: 'var(--salary-teal)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.7rem 1.25rem', fontWeight: '900', fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(13,148,136,0.3)', width: '100%', transition: 'all 0.2s' }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp style={{ width: '18px', height: '18px' }} />}
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {generated && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.75rem' }} className="no-print">
                  {[
                    { label: 'Total Workers', value: salaryRows.length, icon: <Users style={{ width: '20px', height: '20px', color: 'var(--brand)' }} />, color: 'var(--brand)' },
                    { label: 'Total Gross', value: `₹${fmtINR(totals.gross)}`, icon: <TrendingUp style={{ width: '20px', height: '20px', color: 'var(--attendance-green)' }} />, color: 'var(--attendance-green)' },
                    { label: 'Total Advance', value: `₹${fmtINR(totals.advance)}`, icon: <Wallet style={{ width: '20px', height: '20px', color: '#f59e0b' }} />, color: '#f59e0b' },
                    { label: 'Net Payable', value: `₹${fmtINR(totals.net)}`, icon: <IndianRupee style={{ width: '20px', height: '20px', color: 'var(--salary-teal)' }} />, color: 'var(--salary-teal)' },
                  ].map(c => (
                    <div key={c.label} style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '0.85rem', background: `${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</div>
                      <div>
                        <p style={{ margin: '0 0 0.1rem', fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</p>
                        <p style={{ margin: 0, fontWeight: '900', fontSize: '1.05rem', color: 'var(--secondary)' }}>{c.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Report Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--brand)', marginBottom: '0.4rem' }}>
                      <img src="/favicon.ico" alt="Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Construction ERP — Salary Report</span>
                    </div>
                    <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.4rem', color: 'var(--secondary)' }}>{selectedSite.location} • {selectedSite.type}</h2>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                      Period: <span style={{ color: 'var(--brand)' }}>{fmtDate(dateFrom)}</span> to <span style={{ color: 'var(--brand)' }}>{fmtDate(dateTo)}</span>
                      <br/>
                      {isWeekClosed && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', background: 'var(--attendance-green)', color: 'white', padding: '0.4rem 0.85rem', borderRadius: '0.6rem', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}><CheckCircle2 style={{ width: '15px', height: '15px' }} /> WEEK CLOSED & SAVED</span>}
                    </p>
                  </div>
                  <div className="no-print" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {!isWeekClosed && (
                      <button onClick={closeWeek} disabled={saving} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.7rem 1.25rem', borderRadius: '0.8rem', fontWeight: '900', fontSize: '0.82rem', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(245,158,11,0.25)', marginRight: '0.5rem' }}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save style={{ width: '16px', height: '16px' }} />}
                        {saving ? 'Saving...' : 'Close & Save Week'}
                      </button>
                    )}
                    <button onClick={downloadExcel} style={{ background: 'var(--attendance-green)', color: 'white', border: 'none', padding: '0.7rem 1.25rem', borderRadius: '0.8rem', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                      <Download style={{ width: '16px', height: '16px' }} /> Excel
                    </button>
                    <button onClick={() => window.print()} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '0.7rem 1.25rem', borderRadius: '0.8rem', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}>
                      <Printer style={{ width: '16px', height: '16px' }} /> Print
                    </button>
                  </div>
                </div>

                {/* Salary Table */}
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '1rem', background: '#f1f5f9' }}>
                  <table className="salary-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--secondary)' }}>
                        {['#', 'Name', 'ID', 'Category', 'Days', 'OT Hrs', 'Basic (₹)', 'OT Amt (₹)', 'Gross (₹)', 'Advance (₹)', 'Prev Deficit', 'Net Pay (₹)'].map((h, i) => (
                          <th key={h} style={{ color: 'white', padding: '1rem 0.85rem', textAlign: i >= 4 ? 'center' : 'left', fontWeight: '900', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.08)', background: h === 'Net Pay (₹)' ? 'var(--brand)' : h === 'Advance (₹)' ? '#b91c1c' : h === 'Prev Deficit' ? '#d97706' : 'var(--secondary)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRows.map((row, idx) => (
                        <tr key={row.employee_no} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: '700', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', fontWeight: '800', color: 'var(--secondary)', whiteSpace: 'nowrap' }}>{row.name}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>{row.employee_no}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>{row.category || '-'}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'center', fontWeight: '900', color: 'var(--secondary)' }}>{row.presentDays}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'center', fontWeight: '800', color: '#f59e0b' }}>{row.otHours}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '800', color: 'var(--secondary)' }}>₹{fmtINR(row.basicSalary)}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '800', color: '#f59e0b' }}>₹{fmtINR(row.otAmount)}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '900', color: 'var(--secondary)' }}>₹{fmtINR(row.grossSalary)}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '900', color: '#dc2626' }}>{row.advance > 0 ? `₹${fmtINR(row.advance)}` : '—'}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '900', color: '#d97706' }}>{row.carryForward > 0 ? `₹${fmtINR(row.carryForward)}` : '—'}</td>
                          <td style={{ padding: '0.85rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '900', color: row.netSalary >= 0 ? '#16a34a' : '#dc2626' }}>₹{fmtINR(row.netSalary)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--secondary)' }}>
                        <td colSpan={4} style={{ padding: '1rem 0.85rem', color: 'white', fontWeight: '900', fontSize: '0.82rem' }}>TOTAL ({salaryRows.length} Workers)</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'center', color: 'white', fontWeight: '900' }}>{totals.presentDays}</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'center', color: '#fcd34d', fontWeight: '900' }}>{totals.otHours}</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: 'white', fontWeight: '900' }}>₹{fmtINR(totals.basic)}</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: '#fcd34d', fontWeight: '900' }}>₹{fmtINR(totals.otAmt)}</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: 'white', fontWeight: '900' }}>₹{fmtINR(totals.gross)}</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: '#fca5a5', fontWeight: '900' }}>₹{fmtINR(totals.advance)}</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: '#fcd34d', fontWeight: '900' }}>₹{fmtINR(totals.carry)}</td>
                        <td style={{ padding: '1rem 0.85rem', textAlign: 'right', color: totals.net >= 0 ? '#6ee7b7' : '#fca5a5', fontWeight: '900', fontSize: '0.95rem' }}>₹{fmtINR(totals.net)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Verification Section */}
                <div style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6rem', padding: '0 2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '1rem', color: '#cbd5e1', fontStyle: 'italic', fontSize: '0.8rem' }}>
                      Authorized Stamp & Signature
                    </div>
                    <div style={{ borderTop: '2.5px solid var(--secondary)', paddingTop: '0.75rem' }}>
                      <p style={{ margin: 0, fontWeight: '1000', fontSize: '0.9rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site Engineer</p>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>Verification of Weekly Logs</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '1rem', color: '#cbd5e1', fontStyle: 'italic', fontSize: '0.8rem' }}>
                      Authorized Stamp & Signature
                    </div>
                    <div style={{ borderTop: '2.5px solid var(--secondary)', paddingTop: '0.75rem' }}>
                      <p style={{ margin: 0, fontWeight: '1000', fontSize: '0.9rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authorized Administrator</p>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>Final Payroll Authorization</p>
                    </div>
                  </div>
                </div>

                {/* Footer Tag */}
                <div style={{ marginTop: '4rem', textAlign: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '1.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </>
            )}

            {/* Empty State */}
            {!generated && !loading && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '1.5rem', border: '1px dashed var(--border)' }}>
                <CalendarDays style={{ width: '48px', height: '48px', color: 'var(--salary-teal)', margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 0.5rem', fontWeight: '800', color: 'var(--secondary)' }}>Generate New Pay Period</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Choose a date range above to calculate payroll and auto-fetch carry forwards.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
