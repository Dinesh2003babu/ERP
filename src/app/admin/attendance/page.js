'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XSquare,
  X,
  Search,
  Filter,
  CalendarDays,
  Calendar as CalendarIcon,
  ChevronRight,
  User,
  Clock,
  MapPin,
  Undo2,
  Loader2,
  ArrowRight,
  UserCheck,
  Zap,
  ArrowLeft,
  HardHat,
  Printer,
  FileSpreadsheet,
  Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AttendanceApprovalPage() {
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [pendingList, setPendingList] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [statusFilter, setStatusFilter] = useState('pending') // 'pending' | 'approved'
  const [selectedSiteHistory, setSelectedSiteHistory] = useState(null) // {location, type}

  // Custom Range Report States
  const [showMonthlyReport, setShowMonthlyReport] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [monthlyGrid, setMonthlyGrid] = useState({ dates: [], workers: {} })

  useEffect(() => {
    fetchAttendance()
  }, [statusFilter])

  const fmtINR = (num) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num || 0)
  const getInitial = (name) => name?.charAt(0).toUpperCase() || '?'
  const fmtDate = (dateStr) => {
    if (!dateStr) return '-'
    const [y, m, d] = dateStr.split('-')
    return `${d}-${m}-${y}`
  }
  const fmtDateShort = (dateStr) => {
    if (!dateStr) return '-'
    const [y, m, d] = dateStr.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${d} ${months[parseInt(m, 10) - 1]}`
  }
  const getToday = () => new Date().toISOString().split('T')[0]

  async function fetchAttendance() {
    try {
      setLoading(true)
      let query = supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: attData, error: attError } = await query
      if (attError) throw attError

      const { data: empData } = await supabase.from('employees').select('employee_no, name, category')
      const { data: profData } = await supabase.from('profiles').select('id, username')
      const { data: engData } = await supabase.from('engineers').select('engineer_no, name')

      const empMap = (empData || []).reduce((acc, e) => ({ ...acc, [e.employee_no]: e }), {})

      // Dual profiles map: by ID (UUID) and by Username (Normal string)
      const profIdMap = (profData || []).reduce((acc, p) => ({ ...acc, [p.id]: p.username }), {})
      const profUserMap = (profData || []).reduce((acc, p) => ({ ...acc, [p.username.toLowerCase()]: p.username }), {})

      const engNameMap = (engData || []).reduce((acc, e) => ({ ...acc, [e.engineer_no.toLowerCase()]: e.name }), {})

      const grouped = (attData || []).reduce((acc, row) => {
        const key = `${row.location}-${row.type}-${row.date}`
        if (!acc[key]) {
          acc[key] = {
            id: key,
            location: row.location,
            type: row.type,
            date: row.date,
            status: row.status, // capture status of the group
            total_workers: 0,
            details: [],
            rawIds: [],
            // Temp storage for find first available submitter
            allMarkedBy: []
          }
        }

        acc[key].allMarkedBy.push(row.marked_by)
        const empInfo = empMap[row.employee_no]
        acc[key].total_workers += 1
        acc[key].rawIds.push(row.id)
        acc[key].details.push({
          id: row.id,
          employee_no: row.employee_no,
          name: empInfo?.name || 'Unknown',
          category: empInfo?.category || 'Worker',
          present: row.is_present,
          ot: row.ot_hours
        })
        return acc
      }, {})

      // Final pass to resolve the ONE engineer for the WHOLE site group
      const finalSubmissions = Object.values(grouped).map(group => {
        // Find the FIRST non-null marked_by in the group
        const validMarkedBy = group.allMarkedBy.find(m => m !== null && m !== undefined)

        // Resolve uName: Try UUID first, then fallback to treating the field as the username itself
        let uName = profIdMap[validMarkedBy]
        if (!uName && validMarkedBy) {
          // If marked_by doesn't exist in profIdMap, maybe it's already the username
          uName = profUserMap[validMarkedBy.toLowerCase()] || validMarkedBy
        }

        const fName = engNameMap[uName?.toLowerCase()]

        return {
          ...group,
          engineerName: fName || 'System Admin',
          engineerNo: uName || '-'
        }
      })

      setPendingList(finalSubmissions)
      // Reset site history when switching filters
      if (statusFilter === 'pending') setSelectedSiteHistory(null)
    } catch (err) {
      console.error('Robust Fetch Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (group) => {
    try {
      setConfirming(true)
      const { error } = await supabase.from('attendance')
        .update({ status: 'approved' }).in('id', group.rawIds)
      if (error) throw error
      setSelectedSubmission(null)
      fetchAttendance()
    } catch (err) {
      console.error('Confirmation error:', err)
    } finally {
      setConfirming(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const generateMonthlyReport = () => {
    if (!selectedSiteHistory) return

    // 1. Filter data for the selected site and date range
    const siteData = pendingList.filter(item =>
      item.location === selectedSiteHistory.location &&
      item.type === selectedSiteHistory.type &&
      (!dateFrom || item.date >= dateFrom) &&
      (!dateTo || item.date <= dateTo)
    )

    // 2. Get unique dates and sort them
    const uniqueDates = [...new Set(siteData.map(item => item.date))].sort()

    // 3. Aggregate worker data
    const workerMap = {}
    siteData.forEach(day => {
      day.details.forEach(detail => {
        if (!workerMap[detail.employee_no]) {
          workerMap[detail.employee_no] = {
            name: detail.name,
            no: detail.employee_no,
            attendance: {} // date -> status
          }
        }
        workerMap[detail.employee_no].attendance[day.date] = detail.present ? 'P' : 'A'
      })
    })

    setMonthlyGrid({ dates: uniqueDates, workers: workerMap })
    setShowMonthlyReport(true)
  }

  const downloadExcel = () => {
    if (!monthlyGrid.dates.length) return

    // Build the HTML Table with inline styles for Excel
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Attendance Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>
        <table border="1">
          <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold;">
            <th style="padding: 10px;">Worker Name</th>
            <th style="padding: 10px;">Employee ID</th>
            ${monthlyGrid.dates.map(d => `<th style="padding: 10px; text-align: center;">${fmtDateShort(d)}</th>`).join('')}
            <th style="background-color: #0ea5e9; color: #ffffff; padding: 10px;">Total Present</th>
          </tr>
    `

    Object.values(monthlyGrid.workers).forEach((worker, idx) => {
      const presentCount = Object.values(worker.attendance).filter(s => s === 'P').length
      html += `<tr>
        <td style="padding: 8px; font-weight: bold;">${worker.name}</td>
        <td style="padding: 8px;">${worker.no}</td>
        ${monthlyGrid.dates.map(date => {
        const status = worker.attendance[date] || "-"
        const color = status === 'P' ? '#16a34a' : status === 'A' ? '#dc2626' : '#94a3b8'
        return `<td style="padding: 8px; text-align: center; color: ${color}; font-weight: bold;">${status}</td>`
      }).join('')}
        <td style="padding: 8px; text-align: center; font-weight: bold; background-color: #f0f9ff;">${presentCount}</td>
      </tr>`
    })

    html += `</table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Attendance_${selectedSiteHistory.location}_${dateFrom}_to_${dateTo}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--attendance-green)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      {!selectedSubmission && (
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '900', color: 'var(--secondary)', margin: 0, display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <CheckCircle2 style={{ color: 'var(--attendance-green)', width: '32px', height: '32px' }} />
            Attendance Approval
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>Review and verify daily site attendance submissions.</p>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* VIEW 1: SITE QUEUE (Visible only when nothing is selected) */}
        {!selectedSubmission && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Filter Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', background: 'white', padding: '0.4rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                {[
                  { id: 'pending', label: 'PENDING APPROVALS' },
                  { id: 'approved', label: 'APPROVED HISTORY' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.7rem',
                      fontWeight: '900',
                      background: statusFilter === f.id ? 'var(--attendance-green)' : 'transparent',
                      border: 'none',
                      borderRadius: '0.75rem',
                      color: statusFilter === f.id ? 'white' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <h2 style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock className="w-4 h-4" /> {statusFilter === 'pending' ? 'Pending Queue' : 'Approved Records'} ({pendingList.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {statusFilter === 'pending' ? (
                // PENDING VIEW: List Submissions directly
                pendingList.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSubmission(item)}
                    style={{
                      width: '100%',
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '1.25rem',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: 'var(--shadow)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <h3 style={{ fontWeight: '900', margin: 0, fontSize: '1.05rem', color: 'var(--brand)' }}>{item.location}</h3>
                      <span style={{ fontSize: '0.62rem', fontWeight: '950', background: 'var(--brand)', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '0.6rem', textTransform: 'uppercase' }}>
                        {item.type}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                        <CalendarIcon className="w-3.5 h-3.5" /> {fmtDate(item.date)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                        <User className="w-3.5 h-3.5" /> {item.total_workers} L
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', padding: '0.4rem 0.65rem', background: '#f8fafc', borderRadius: '0.6rem', border: '1px solid #f1f5f9' }}>
                      <HardHat style={{ width: '12px', height: '12px', color: 'var(--reports-indigo)' }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: '850', color: 'var(--secondary)', textTransform: 'uppercase' }}>
                        By: {item.engineerName}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                // APPROVED HISTORY VIEW
                !selectedSiteHistory ? (
                  // Step 1: List Unique Sites
                  Object.values(pendingList.reduce((acc, row) => {
                    const key = `${row.location}-${row.type}`
                    if (!acc[key]) {
                      acc[key] = { location: row.location, type: row.type, totalRecords: 0 }
                    }
                    acc[key].totalRecords += 1
                    return acc
                  }, {})).map((site) => (
                    <button
                      key={`${site.location}-${site.type}`}
                      onClick={() => setSelectedSiteHistory(site)}
                      style={{
                        width: '100%',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: '1.25rem',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: 'var(--shadow)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <h3 style={{ fontWeight: '900', margin: 0, fontSize: '1.05rem', color: 'var(--secondary)' }}>{site.location}</h3>
                        <span style={{ fontSize: '0.62rem', fontWeight: '950', background: 'var(--border)', color: 'var(--text-muted)', padding: '0.3rem 0.6rem', borderRadius: '0.6rem', textTransform: 'uppercase' }}>
                          {site.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--attendance-green)', fontSize: '0.75rem', fontWeight: '850' }}>
                        <CheckCircle2 className="w-4 h-4" />
                        {site.totalRecords} Approved Records
                      </div>
                    </button>
                  ))
                ) : (
                  // Step 2: List Dates for the selected site
                  <>
                    <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                      <button
                        onClick={() => setSelectedSiteHistory(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--brand)', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer', width: 'fit-content' }}
                      >
                        <ArrowLeft className="w-4 h-4" /> BACK TO SITE LIST
                      </button>

                      <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="no-print">
                        {/* Row 1: Label + Clear */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarDays style={{ width: '16px', height: '16px', color: 'var(--brand)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date Range Filter</span>
                          </div>
                          {dateFrom && (
                            <button
                              onClick={() => {
                                setDateFrom('')
                                setDateTo(getToday())
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
                        </div>
                        <button
                          onClick={generateMonthlyReport}
                          style={{ background: 'var(--reports-indigo)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.75rem 1.5rem', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', width: '100%' }}
                        >
                          <FileSpreadsheet className="w-4 h-4" /> GENERATE REPORT
                        </button>
                      </div>

                      <div style={{ marginBottom: '0.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--secondary)' }}>{selectedSiteHistory.location}</h2>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>{selectedSiteHistory.type} Project History</p>
                      </div>
                    </div>
                    {pendingList
                      .filter(item =>
                        item.location === selectedSiteHistory.location &&
                        item.type === selectedSiteHistory.type &&
                        (!dateFrom || item.date >= dateFrom) &&
                        (!dateTo || item.date <= dateTo)
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSubmission(item)}
                          style={{
                            width: '100%',
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: '1.25rem',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: 'var(--shadow)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: '900', color: 'var(--secondary)' }}>
                              <CalendarIcon className="w-4 h-4 text-sky-500" /> {fmtDate(item.date)}
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: '950', color: '#16a34a', background: '#f0fdf4', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>
                              {item.total_workers} LABOUR
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                            Engineer: {item.engineerName}
                          </p>
                        </button>
                      ))
                    }
                  </>
                )
              )}

              {pendingList.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '2rem', border: '1px dashed var(--border)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '1.25rem', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <CheckCircle2 style={{ color: 'var(--attendance-green)', width: '28px', height: '28px' }} />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.25rem' }}>
                    {statusFilter === 'pending' ? 'Queue Empty' : 'No Records Found'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {statusFilter === 'pending'
                      ? 'All sitework is currently verified and approved.'
                      : 'No approved attendance history is available.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: DETAILED REVIEW (Visible only when a site is selected) */}
        {selectedSubmission && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease' }}>
            {/* Context Navigation */}
            <button
              onClick={() => setSelectedSubmission(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--reports-indigo)', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', marginBottom: '0.25rem', width: 'fit-content' }}
            >
              <ArrowLeft className="w-4 h-4" /> BACK TO QUEUE
            </button>

            <div style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {/* Header */}
              <div style={{ background: 'var(--secondary)', padding: '1.25rem 1.5rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: '900', margin: 0 }}>{selectedSubmission.location}</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '750', textTransform: 'uppercase', margin: '0.2rem 0 0', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {selectedSubmission.type} Site | {fmtDate(selectedSubmission.date)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', color: 'var(--brand-light)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    <HardHat style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                    <span>By: {selectedSubmission.engineerName} ({selectedSubmission.engineerNo})</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="no-print">
                  <button
                    onClick={() => window.print()}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.75rem', padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'white', fontSize: '0.75rem', fontWeight: '800' }}
                  >
                    <Printer className="w-4 h-4" /> PRINT
                  </button>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                  >
                    <X style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>
              </div>

              {/* Action Board (Stacked on Mobile) */}
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: 'white', border: '1px solid var(--border)', padding: '0.85rem 0.5rem', borderRadius: '1rem', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0, color: 'var(--secondary)' }}>{selectedSubmission.total_workers}</p>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #dcfce7', padding: '0.85rem 0.5rem', borderRadius: '1rem', textAlign: 'center', boxShadow: '0 2px 4px rgba(22,163,74,0.05)' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: '950', color: '#16a34a', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Present</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0, color: '#16a34a' }}>
                      {selectedSubmission.details.filter(d => d.present).length}
                    </p>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #fee2e2', padding: '0.85rem 0.5rem', borderRadius: '1rem', textAlign: 'center', boxShadow: '0 2px 4px rgba(220,38,38,0.05)' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: '950', color: '#dc2626', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Absent</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0, color: '#dc2626' }}>
                      {selectedSubmission.details.filter(d => !d.present).length}
                    </p>
                  </div>
                </div>

                {/* High Density Row List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.65rem 1.5rem', background: '#f1f5f9', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: '0.62rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Worker</span>
                    <span style={{ width: '80px', textAlign: 'center', fontSize: '0.62rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                    <span style={{ width: '60px', textAlign: 'right', fontSize: '0.62rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OT</span>
                  </div>
                  {selectedSubmission.details.map((row) => (
                    <div key={row.id} style={{ display: 'flex', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f8fafc', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--secondary)', fontSize: '0.85rem', flexShrink: 0 }}>
                          {getInitial(row.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</p>
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', fontWeight: '750', color: 'var(--text-muted)' }}>{row.employee_no} <br /> {row.category}</p>
                        </div>
                      </div>
                      <div style={{ width: '80px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.58rem',
                          fontWeight: '950',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '2rem',
                          textTransform: 'uppercase',
                          background: row.present ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                          color: row.present ? 'var(--attendance-green)' : '#f43f5e',
                          border: `1px solid ${row.present ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}`
                        }}>
                          {row.present ? 'Present' : 'Absent'}
                        </span>
                      </div>
                      <div style={{ width: '60px', textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontWeight: '900', color: row.ot > 0 ? '#f59e0b' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {row.ot > 0 ? `${row.ot}h` : '0h'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSubmission.status === 'pending' ? (
                  <button
                    onClick={() => handleConfirm(selectedSubmission)}
                    disabled={confirming}
                    style={{
                      width: '100%',
                      background: 'var(--attendance-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '1rem',
                      padding: '0.9rem',
                      fontSize: '0.9rem',
                      fontWeight: '950',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
                      opacity: confirming ? 0.7 : 1
                    }}
                  >
                    {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                    {confirming ? 'APPROVING...' : 'APPROVE ALL RECORDS'}
                  </button>
                ) : (
                  <div style={{
                    width: '100%',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    borderRadius: '1rem',
                    padding: '0.9rem',
                    fontSize: '0.9rem',
                    fontWeight: '950',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem'
                  }}>
                    <CheckCircle2 className="w-5 h-5" />
                    RECORD APPROVED
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 3: MONTHLY MASTER REPORT (Overlay/Modal style) */}
      {showMonthlyReport && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 1000, overflow: 'auto', padding: '1.5rem' }} className="print-area">
          <div style={{ width: '100%', margin: '0 auto', background: 'white', borderRadius: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '2.5rem', border: '1px solid var(--border)', minHeight: '100%' }}>
            {/* Professional Header */}
            <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid var(--secondary)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--brand)', marginBottom: '0.5rem' }}>
                  <img src="/favicon.ico" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Construction ERP Official Record</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: '1000', color: 'var(--secondary)', letterSpacing: '-0.02em', lineHeight: 1 }}>SITE ATTENDANCE REPORT</h1>
                <div className="report-info-grid" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="info-box" style={{ background: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '850', color: 'var(--secondary)' }}>
                    Site: <span style={{ color: 'var(--brand)' }}>{selectedSiteHistory.location.toUpperCase()}</span>
                  </div>
                  <div className="info-box" style={{ background: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '850', color: 'var(--secondary)' }}>
                    From: <span style={{ color: 'var(--brand)' }}>{dateFrom ? fmtDate(dateFrom) : 'START'} </span> To: <span style={{ color: 'var(--brand)' }}> {dateTo ? fmtDate(dateTo) : 'END'}</span>
                  </div>
                </div>
              </div>
              <div className="report-actions no-print" style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={downloadExcel} style={{ background: 'var(--attendance-green)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '0.8rem', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                  <Download className="w-5 h-5" /> Excel
                </button>
                <button onClick={handlePrint} className="print-btn" style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '0.8rem 1.75rem', borderRadius: '0.8rem', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}>
                  <Printer className="w-5 h-5" /> PDF
                </button>
                <button onClick={() => setShowMonthlyReport(false)} className="close-btn" style={{ background: '#f1f5f9', color: 'var(--secondary)', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '0.8rem', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer' }}>
                  CLOSE
                </button>
              </div>
            </div>

            {/* Master Attendance Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '1rem', background: '#f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ background: 'var(--secondary)' }}>
                    <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--secondary)', color: 'white', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '1rem 0.75rem', textAlign: 'left', minWidth: '160px', fontWeight: '900', textTransform: 'uppercase' }}>Worker Details</th>
                    {monthlyGrid.dates.map(date => (
                      <th key={date} style={{ color: 'white', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0.4rem', textAlign: 'center', width: '45px', fontWeight: '900', whiteSpace: 'nowrap' }}>
                        {fmtDateShort(date)}
                      </th>
                    ))}
                    <th style={{ background: 'var(--brand)', color: 'white', padding: '0.75rem', textAlign: 'center', fontWeight: '1000', width: '50px' }}>TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(monthlyGrid.workers).map((worker, idx) => {
                    const presentCount = Object.values(worker.attendance).filter(s => s === 'P').length
                    return (
                      <tr key={worker.no} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 5, background: idx % 2 === 0 ? 'white' : '#f8fafc', borderRight: '1.5px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '0.65rem 0.75rem' }}>
                          <div style={{ fontWeight: '900', color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '0.1rem' }}>{worker.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '750', letterSpacing: '0.02em' }}>ID: {worker.no}</div>
                        </td>
                        {monthlyGrid.dates.map(date => {
                          const status = worker.attendance[date]
                          return (
                            <td key={date} style={{
                              borderRight: '1px solid #e2e8f0',
                              borderBottom: '1px solid #e2e8f0',
                              padding: '0.6rem 0.2rem',
                              textAlign: 'center',
                              fontWeight: '1000',
                              color: status === 'P' ? '#16a34a' : status === 'A' ? '#dc2626' : '#cbd5e1',
                              fontSize: '0.85rem',
                              background: status === 'A' ? 'rgba(220,38,38,0.02)' : 'transparent'
                            }}>
                              {status === 'P' ? 'P' : status === 'A' ? 'A' : '-'}
                            </td>
                          )
                        })}
                        <td style={{ borderBottom: '1px solid var(--border)', padding: '0.6rem', textAlign: 'center', fontWeight: '1000', background: 'rgba(14,165,233,0.05)', color: 'var(--brand)', fontSize: '0.95rem' }}>
                          {presentCount}
                        </td>
                      </tr>
                    )
                  })}
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
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>Verification of Daily Logs</p>
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
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media print {
          @page { size: landscape; margin: 10mm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
          .print-area { border-radius: 0 !important; padding: 0 !important; }
          table { font-size: 0.6rem !important; }
          th, td { padding: 4px 2px !important; }
        }

        @media (max-width: 768px) {
          .report-header {
            flex-direction: column !important;
            gap: 1.5rem !important;
            align-items: center !important;
            text-align: center !important;
          }
          .report-header h1 {
            font-size: 1.5rem !important;
          }
          .report-info-grid {
            flex-direction: column !important;
            width: 100% !important;
            gap: 0.5rem !important;
          }
          .info-box {
            width: 100% !important;
            text-align: center !important;
          }
          .report-actions {
            width: 100% !important;
            justify-content: center !important;
          }
          .print-btn {
            flex: 1 !important;
            padding: 0.75rem !important;
            font-size: 0.75rem !important;
          }
          .close-btn {
            padding: 0.75rem !important;
            font-size: 0.75rem !important;
          }
          .print-area {
            padding: 0.75rem !important;
          }
          .print-area > div {
            padding: 1rem !important;
            border-radius: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}
