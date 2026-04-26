'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock,
  Save,
  AlertCircle,
  Loader2,
  HardHat,
  CalendarDays,
  TrendingUp,
  IndianRupee,
  Briefcase,
  MapPin,
  CheckSquare,
  Wallet,
  PlusCircle,
  Trash2,
  Camera,
  MessageSquare,
  Smartphone
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── VIEW CONSTANTS ────────────────────────────────────────────────────────────
const VIEW_HOME = 'home'
const VIEW_LABOUR = 'labour'
const VIEW_EMPLOYEE = 'employee'
const VIEW_ATTENDANCE = 'attendance'
const VIEW_ADVANCE = 'advance'

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function getToday() {
  return new Date().toISOString().split('T')[0]
}
function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDay(iso) {
  const d = new Date(iso)
  return { day: d.getDate(), weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }), month: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) }
}
function getInitial(name) {
  return (name || '?')[0].toUpperCase()
}

export default function EngineerDashboard() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(VIEW_HOME)

  // Engineer / site data
  const [engineer, setEngineer] = useState({ id: '', name: '', location: '', type: '', username: '' })
  const [employees, setEmployees] = useState([])

  // Labour Detail view
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [empAttendance, setEmpAttendance] = useState([])
  const [empLoading, setEmpLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(getToday())

  // Attendance marking view
  const [attendanceDate, setAttendanceDate] = useState(getToday())
  const [attendanceMap, setAttendanceMap] = useState({})   // { empNo: { present, ot } }
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingLog, setExistingLog] = useState([])
  const [isApproved, setIsApproved] = useState(false)
  const [offlineDraft, setOfflineDraft] = useState(false)
  const [sitePhoto, setSitePhoto] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Advance view
  const [advances, setAdvances] = useState([])
  const [advLoading, setAdvLoading] = useState(false)
  const [advForm, setAdvForm] = useState({ employee_no: '', amount: '', date: getToday(), reason: '' })
  const [advSubmitting, setAdvSubmitting] = useState(false)
  const [advSuccess, setAdvSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadProfile()
  }, [])

  // Auto-save draft to local storage
  useEffect(() => {
    if (view === VIEW_ATTENDANCE && !isApproved && Object.keys(attendanceMap).length > 0) {
      localStorage.setItem(`draft_att_${engineer.location}_${engineer.type}`, JSON.stringify(attendanceMap))
    }
  }, [attendanceMap, view, isApproved, engineer.location, engineer.type])

  // ── Load site employees ───────────────────────────────────
  async function loadProfile() {
    try {
      setLoading(true)
      const userId = localStorage.getItem('user_id')
      if (!userId) { window.location.href = '/'; return }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, location, type, role')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Attempt to fetch name from engineers table using the ID
      let displayName = profile.username || 'Engineer'
      let engineerNo = profile.username || ''
      if (profile.role === 'engineer') {
        const { data: engData } = await supabase
          .from('engineers')
          .select('engineer_no, name')
          .eq('engineer_no', profile.username)
          .single()

        if (engData) {
          displayName = engData.name
          engineerNo = engData.engineer_no
        }
      }

      setEngineer({
        id: profile.id,
        engineer_no: engineerNo,
        name: displayName,
        username: profile.username || '',
        location: profile.location || '',
        type: profile.type || '',
        role: profile.role || 'engineer'
      })

      if (profile.location && profile.type) {
        const { data: roster } = await supabase
          .from('employees')
          .select('*')
          .eq('location', profile.location)
          .eq('type', profile.type)
          .eq('status', 'active')
          .order('employee_no')

        setEmployees(roster || [])
        const init = (roster || []).reduce((a, e) => ({ ...a, [e.employee_no]: { present: false, ot: 0 } }), {})
        setAttendanceMap(init)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch employee attendance records ────────────────────────────────────────
  async function loadEmployeeAttendance(emp) {
    setSelectedEmployee(emp)
    setView(VIEW_EMPLOYEE)
    setEmpLoading(true)
    try {
      let q = supabase
        .from('attendance')
        .select('*')
        .eq('employee_no', emp.employee_no)
        .eq('location', engineer.location)
        .eq('type', engineer.type)
        .lte('date', dateTo)
        .order('date', { ascending: false })
      // Only apply lower date bound if user explicitly set a from-date
      if (dateFrom) q = q.gte('date', dateFrom)

      const { data } = await q
      setEmpAttendance(data || [])
    } catch (err) { console.error(err) } finally { setEmpLoading(false) }
  }

  async function refreshEmployeeAttendance(emp) {
    setEmpLoading(true)
    try {
      let q = supabase
        .from('attendance')
        .select('*')
        .eq('employee_no', emp.employee_no)
        .eq('location', engineer.location)
        .eq('type', engineer.type)
        .lte('date', dateTo)
        .order('date', { ascending: false })
      if (dateFrom) q = q.gte('date', dateFrom)

      const { data } = await q
      setEmpAttendance(data || [])
    } catch (err) { console.error(err) } finally { setEmpLoading(false) }
  }

  // ── Load existing attendance for a date ───────────────────────────────────────
  async function loadExistingAttendance(date) {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('location', engineer.location)
      .eq('type', engineer.type)
      .eq('date', date)
    setExistingLog(data || [])
    // Lock if admin already approved
    const approved = (data || []).some(r => r.status === 'approved')
    setIsApproved(approved)
    // Pre-fill from existing; default = all absent
    if (data && data.length > 0) {
      const pre = data.reduce((a, r) => ({ ...a, [r.employee_no]: { present: r.is_present, ot: r.ot_hours || 0 } }), {})
      setAttendanceMap(pre)
    } else {
      // Try to load draft if exists
      const draft = localStorage.getItem(`draft_att_${engineer.location}_${engineer.type}`)
      if (draft) {
        setAttendanceMap(JSON.parse(draft))
        setOfflineDraft(true)
      } else {
        const init = employees.reduce((a, e) => ({ ...a, [e.employee_no]: { present: false, ot: 0 } }), {})
        setAttendanceMap(init)
      }
    }
  }

  function openAttendance() {
    setView(VIEW_ATTENDANCE)
    setSubmitted(false)
    setIsApproved(false)
    loadExistingAttendance(getToday())  // always load TODAY
  }

  function togglePresent(empNo) {
    if (isApproved) return  // hard block when approved
    setAttendanceMap(p => ({ ...p, [empNo]: { ...p[empNo], present: !p[empNo]?.present } }))
  }

  function changeOT(empNo, delta) {
    if (isApproved) return
    setAttendanceMap(p => ({
      ...p,
      [empNo]: { ...p[empNo], ot: Math.max(0, (p[empNo]?.ot || 0) + delta) }
    }))
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${engineer.location}_${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('site-photos')
        .upload(fileName, file)

      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
      setSitePhoto(publicUrl)
    } catch (err) {
      alert('Photo upload failed: ' + err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function submitAttendance() {
    if (submitting || isApproved) return
    try {
      setSubmitting(true)
      const alreadySubmitted = existingLog.length > 0
      const today = getToday()
      const rows = employees.map(emp => ({
        employee_no: emp.employee_no,
        location: engineer.location,
        type: engineer.type,
        date: today,
        is_present: attendanceMap[emp.employee_no]?.present || false,
        ot_hours: attendanceMap[emp.employee_no]?.ot || 0,
        status: 'pending',
        marked_by: engineer.id
      }))

      if (alreadySubmitted) {
        for (const row of rows) {
          await supabase.from('attendance').update({
            is_present: row.is_present,
            ot_hours: row.ot_hours,
            status: 'pending',
            marked_by: engineer.id,
            photo_url: sitePhoto
          }).eq('employee_no', row.employee_no).eq('location', row.location).eq('type', row.type).eq('date', row.date)
        }
      } else {
        const { error } = await supabase.from('attendance').insert(rows)
        if (error) throw error
      }

      // Save photo to separate table if exists
      if (sitePhoto) {
        await supabase.from('site_photos').insert({
          location: engineer.location,
          type: engineer.type,
          date: today,
          photo_url: sitePhoto,
          marked_by: engineer.id
        })
      }

      localStorage.removeItem(`draft_att_${engineer.location}_${engineer.type}`) // clear draft on success
      setSubmitted(true)
    } catch (err) {
      alert('Submission failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Compute employee stats from attendance log ────────────────────────────────
  function computeStats(log, emp) {
    const confirmed = log.filter(r => r.status === 'confirmed' || r.status === 'pending' || r.status === 'approved')
    const present = confirmed.filter(r => r.is_present)
    const totalOT = confirmed.reduce((s, r) => s + (r.ot_hours || 0), 0)
    const totalDays = confirmed.length
    const presentDays = present.length
    const pct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
    const amount = presentDays * (emp?.pay_rate || 0) + totalOT * ((emp?.pay_rate || 0) / 8)
    return { presentDays, totalOT, pct, amount: Math.round(amount) }
  }

  // Indian Numbering System Formatting
  function fmtINR(val) {
    return new Intl.NumberFormat('en-IN').format(val)
  }

  // ── Advance functions ────────────────────────────────────────────────────────
  async function loadAdvances() {
    setAdvLoading(true)
    try {
      const { data } = await supabase
        .from('advances')
        .select('*')
        .eq('location', engineer.location)
        .eq('type', engineer.type)
        .order('date', { ascending: false })
      setAdvances(data || [])
    } catch (err) { console.error(err) } finally { setAdvLoading(false) }
  }

  async function submitAdvance() {
    if (!advForm.employee_no || !advForm.amount || advSubmitting) return
    const emp = employees.find(e => e.employee_no === advForm.employee_no)
    setAdvSubmitting(true)
    try {
      const { error } = await supabase.from('advances').insert({
        employee_no: advForm.employee_no,
        employee_name: emp?.name || '',
        amount: Number(advForm.amount),
        date: advForm.date,
        reason: advForm.reason || null,
        location: engineer.location,
        type: engineer.type,
        given_by: engineer.name
      })
      if (error) throw error
      setAdvForm({ employee_no: '', amount: '', date: getToday(), reason: '' })
      setAdvSuccess(true)
      setTimeout(() => setAdvSuccess(false), 3000)
      loadAdvances()
    } catch (err) {
      alert('Failed to save advance: ' + err.message)
    } finally { setAdvSubmitting(false) }
  }

  async function deleteAdvance(id) {
    if (!confirm('Delete this advance record?')) return
    await supabase.from('advances').delete().eq('id', id)
    loadAdvances()
  }

  // ─── LOADING ─────────────────────────────────────────────────────────────────
  if (!mounted || loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  if (!engineer.location) return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '2rem', border: '1px dashed #f43f5e' }}>
      <AlertCircle style={{ width: '48px', height: '48px', color: '#f43f5e', margin: '0 auto 1rem' }} />
      <h3 style={{ margin: 0, fontWeight: '800' }}>No Site Assigned</h3>
      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Ask admin to assign you to a construction site.</p>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: HOME
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_HOME) return (
    <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Engineer Profile Card */}
      <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem 2rem', background: 'white', borderRadius: '2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(14,165,233,0.3)' }}>
          <HardHat style={{ width: '34px', height: '34px', color: 'white' }} />
        </div>
        <h2 style={{ margin: '0 0 0.2rem', fontWeight: '900', fontSize: '1.5rem', color: 'var(--secondary)' }}>{engineer.engineer_no || engineer.username}</h2>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '1.05rem' }}>{engineer.name}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--brand-light)', color: 'var(--brand-dark)', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: '800' }}>
          <MapPin style={{ width: '14px', height: '14px' }} />
          {engineer.location} • {engineer.type}
        </div>
      </div>

      {/* Labour Details Card */}
      <button
        onClick={() => setView(VIEW_LABOUR)}
        style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}
      >
        <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users style={{ width: '26px', height: '26px', color: 'var(--employees-purple)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 0.2rem', fontWeight: '900', fontSize: '1.05rem', color: 'var(--secondary)' }}>Labour Details</p>
        </div>
        <ChevronRight style={{ color: '#94a3b8', flexShrink: 0 }} />
      </button>

      {/* Attendance Card */}
      <button
        onClick={openAttendance}
        style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}
      >
        <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckSquare style={{ width: '26px', height: '26px', color: 'var(--attendance-green)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 0.2rem', fontWeight: '900', fontSize: '1.05rem', color: 'var(--secondary)' }}>Attendance</p>
        </div>
        <ChevronRight style={{ color: '#94a3b8', flexShrink: 0 }} />
      </button>

      {/* Advance Card */}
      <button
        onClick={() => { setView(VIEW_ADVANCE); loadAdvances() }}
        style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}
      >
        <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wallet style={{ width: '26px', height: '26px', color: '#f59e0b' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 0.2rem', fontWeight: '900', fontSize: '1.05rem', color: 'var(--secondary)' }}>Advance</p>
          {/* <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '600' }}>Give advance to workers</p> */}
        </div>
        <ChevronRight style={{ color: '#94a3b8', flexShrink: 0 }} />
      </button>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: LABOUR LIST
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_LABOUR) return (
    <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
        <button onClick={() => setView(VIEW_HOME)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)' }}>
          <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)' }}>Labour Details</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Workers: {employees.length}</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No workers assigned to this site.</div>
      ) : employees.map(emp => (
        <button
          key={emp.employee_no}
          onClick={() => loadEmployeeAttendance(emp)}
          style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem', color: 'var(--secondary)', flexShrink: 0, border: '1px solid var(--border)' }}>
            {getInitial(emp.name)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 0.15rem', fontWeight: '800', color: 'var(--secondary)' }}>{emp.name}</p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>{emp.employee_no}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: '0 0 0.15rem', fontWeight: '800', color: 'var(--attendance-green)', fontSize: '0.9rem' }}>₹{fmtINR(emp.pay_rate)}/day</p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
              <Briefcase style={{ width: '11px', height: '11px' }} />{emp.category}
            </p>
          </div>
        </button>
      ))}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: EMPLOYEE DETAIL (drill-down)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_EMPLOYEE && selectedEmployee) {
    const stats = computeStats(empAttendance, selectedEmployee)
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <button
            onClick={() => setView(VIEW_LABOUR)}
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: 'var(--shadow)'
            }}
          >
            <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)' }}>{selectedEmployee.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase' }}>{selectedEmployee.category} • {selectedEmployee.employee_no}</p>
          </div>
        </div>

        {/* Date Range Filter */}
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

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { label: 'WORKED DAYS', icon: <CalendarDays style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />, value: stats.presentDays, sub: 'Present Days', color: '#8b5cf6' },
            { label: 'OT', icon: <Clock style={{ width: '16px', height: '16px', color: '#f59e0b' }} />, value: `${stats.totalOT}h`, sub: 'Overtime Hours', color: '#f59e0b' },
            { label: 'ATTENDANCE', icon: <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--attendance-green)' }} />, value: `${stats.pct}%`, sub: 'Attendance Rate', color: 'var(--attendance-green)' },
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

        {/* Attendance Log */}
        <div style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontWeight: '800', color: 'var(--secondary)' }}>Attendance Report</p>
          </div>
          {empLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)', margin: '0 auto' }} /></div>
          ) : empAttendance.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No records found for this period.</div>
          ) : empAttendance.map(row => {
            const d = fmtDay(row.date)
            return (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.95rem', color: 'var(--secondary)', flexShrink: 0 }}>
                  {d.day}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '700', color: 'var(--secondary)', fontSize: '0.9rem' }}>{d.weekday}</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{d.month}</p>
                </div>
                {row.ot_hours > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#f59e0b', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>OT {row.ot_hours}h</span>
                )}
                <span className={`status-pill ${row.is_present ? 'present' : 'absent'}`}>{row.is_present ? 'Present' : 'Absent'}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: ATTENDANCE MARKING
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_ATTENDANCE) {
    const presentCount = Object.values(attendanceMap).filter(v => v.present).length

    if (submitted) return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', background: 'white', borderRadius: '2rem', padding: '3rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <CheckCircle2 style={{ width: '56px', height: '56px', color: 'var(--attendance-green)', margin: '0 auto 1rem' }} />
        <h2 style={{ margin: '0 0 0.5rem', fontWeight: '900' }}>Submitted!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Attendance for <b>{fmtDate(getToday())}</b> sent to admin for approval.</p>

        <button
          onClick={() => {
            const msg = `Hi Admin, I have submitted the attendance for ${engineer.location} (${engineer.type}) today. Please review and approve.`
            window.open(`https://wa.me/918668189727?text=${encodeURIComponent(msg)}`, '_blank')
          }}
          style={{ width: '100%', marginTop: '1.5rem', background: '#25D366', color: 'white', border: 'none', padding: '1rem', borderRadius: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: '0 8px 20px rgba(37,211,102,0.3)' }}
        >
          <MessageSquare style={{ width: '20px', height: '20px' }} /> Notify via WhatsApp
        </button>

        <button onClick={() => { setSubmitted(false); setView(VIEW_HOME) }} style={{ width: '100%', marginTop: '1rem', background: 'var(--secondary)', color: 'white', border: 'none', padding: '1rem', borderRadius: '1.25rem', fontWeight: '800' }}>Back to Home</button>
      </div>
    )

    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <button onClick={() => setView(VIEW_HOME)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)' }}>
            <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
          </button>
          <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)' }}>Attendance</h2>
        </div>

        {/* Today Date Card */}
        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow)' }}>
          <CalendarDays style={{ width: '20px', height: '20px', color: 'var(--brand)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 0.1rem', fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marking Attendance For</p>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '1rem', color: 'var(--secondary)' }}>{fmtDate(getToday())}</p>
          </div>
          <span style={{ background: 'var(--brand)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: '900', flexShrink: 0 }}>TODAY ONLY</span>
        </div>

        {/* Approval Lock Banner */}
        {isApproved && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid var(--attendance-green)', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 style={{ width: '22px', height: '22px', color: 'var(--attendance-green)', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: '800', color: 'var(--attendance-green)', fontSize: '0.9rem' }}>Approved by Admin</p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>Today&apos;s attendance is locked. Contact admin to make changes.</p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))', borderRadius: '1.25rem', padding: '1.25rem', color: 'white', boxShadow: '0 8px 20px rgba(14,165,233,0.3)' }}>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: '700', opacity: 0.85 }}>Present Today</p>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '2rem' }}>{presentCount}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Total Workforce</p>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '2rem', color: 'var(--secondary)' }}>{employees.length}</p>
          </div>
        </div>

        {/* Progress Photo Section */}
        {!isApproved && (
          <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera style={{ width: '18px', height: '18px', color: 'var(--brand)' }} />
              <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--secondary)' }}>Daily Site Progress Photo</span>
            </div>

            {!sitePhoto ? (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: '0.75rem', padding: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle style={{ width: '20px', height: '20px' }} />}
                {uploadingPhoto ? 'Uploading...' : 'Take or Upload Site Photo'}
              </label>
            ) : (
              <div style={{ position: 'relative' }}>
                <img src={sitePhoto} alt="Progress" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '0.75rem' }} />
                <button onClick={() => setSitePhoto(null)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(244,63,94,0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Worker List header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.25rem' }}>
          <p style={{ margin: 0, fontWeight: '800', color: 'var(--secondary)', fontSize: '1rem' }}>Worker List</p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: isApproved ? 'var(--attendance-green)' : 'var(--text-muted)', fontWeight: '600' }}>
            {isApproved ? '🔒 Locked' : 'Tap to mark present'}
          </p>
        </div>

        {/* Workers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {employees.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Users style={{ width: '3rem', height: '3rem', color: 'var(--text-muted)', opacity: 0.5 }} />
              <div>
                <p style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)', fontSize: '1.1rem' }}>No Workers Assigned</p>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>There are no employees assigned to your current site.</p>
              </div>
            </div>
          ) : employees.map(emp => {
            const isPresent = attendanceMap[emp.employee_no]?.present || false
            const ot = attendanceMap[emp.employee_no]?.ot || 0
            return (
              <div key={emp.employee_no} style={{ background: 'white', borderRadius: '1.5rem', border: `2px solid ${isPresent ? 'var(--attendance-green)' : 'var(--border)'}`, overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: isPresent ? '0 4px 14px rgba(16,185,129,0.15)' : 'var(--shadow)', opacity: isApproved ? 0.85 : 1 }}>
                <div
                  onClick={() => togglePresent(emp.employee_no)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.1rem 1.25rem', cursor: isApproved ? 'default' : 'pointer' }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '0.85rem', background: isPresent ? 'var(--attendance-green)' : 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem', color: isPresent ? 'white' : 'var(--secondary)', flexShrink: 0, transition: 'all 0.2s' }}>
                    {getInitial(emp.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.15rem', fontWeight: '800', color: 'var(--secondary)' }}>{emp.name}</p>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: '700' }}>{emp.category} • ₹{fmtINR(emp.pay_rate)}/day</p>
                  </div>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: `2px solid ${isPresent ? 'var(--attendance-green)' : '#cbd5e1'}`, background: isPresent ? 'var(--attendance-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                    {isPresent && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                </div>

                {isPresent && !isApproved && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(16,185,129,0.15)', background: 'rgba(16,185,129,0.04)' }}>
                    <Clock style={{ width: '16px', height: '16px', color: '#f59e0b', marginRight: '0.5rem' }} />
                    <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1 }}>OverTime (OT)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button onClick={e => { e.stopPropagation(); changeOT(emp.employee_no, -1) }} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border)', background: 'white', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>−</button>
                      <span style={{ fontWeight: '900', minWidth: '20px', textAlign: 'center', color: 'var(--secondary)' }}>{ot}</span>
                      <button onClick={e => { e.stopPropagation(); changeOT(emp.employee_no, +1) }} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border)', background: 'white', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>+</button>
                    </div>
                  </div>
                )}
                {isPresent && isApproved && ot > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.25rem', borderTop: '1px solid rgba(16,185,129,0.15)', background: 'rgba(16,185,129,0.04)' }}>
                    <Clock style={{ width: '14px', height: '14px', color: '#f59e0b', marginRight: '0.4rem' }} />
                    <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.82rem' }}>OT: {ot}h</span>
                  </div>
                )}
              </div>
            )
          })}

          {!isApproved && (
            <button
              onClick={submitAttendance}
              disabled={submitting}
              style={{ padding: '1.1rem', borderRadius: '1.5rem', border: 'none', fontWeight: '900', fontSize: '1rem', background: submitting ? 'var(--text-muted)' : 'var(--attendance-green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', width: '100%', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', marginBottom: '2rem' }}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save style={{ width: '20px', height: '20px' }} />}
              {submitting ? 'Submitting...' : existingLog.length > 0 ? 'Update & Resubmit' : 'Submit to Admin'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIEW: ADVANCE
  // ═══════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_ADVANCE) {
    const totalAdvanced = advances.reduce((s, a) => s + Number(a.amount), 0)
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <button onClick={() => setView(VIEW_HOME)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)' }}>
            <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)' }}>Advance</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{engineer.location} • {engineer.type}</p>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet style={{ width: '26px', height: '26px', color: 'white' }} />
          </div>
          <div>
            <p style={{ margin: '0 0 0.1rem', fontSize: '0.72rem', fontWeight: '700', opacity: 0.85 }}>TOTAL ADVANCED THIS SITE</p>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem' }}>₹{fmtINR(totalAdvanced)}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.8 }}>{advances.length} record{advances.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.25rem' }}>
          <p style={{ margin: 0, fontWeight: '800', color: 'var(--secondary)', fontSize: '1rem' }}>Worker List</p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Tap to give advance</p>
        </div>

        {advSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.08)', border: '1px solid var(--attendance-green)', borderRadius: '0.75rem', padding: '0.65rem 0.85rem' }}>
            <CheckCircle2 style={{ width: '18px', height: '18px', color: 'var(--attendance-green)', flexShrink: 0 }} />
            <span style={{ fontWeight: '700', color: 'var(--attendance-green)', fontSize: '0.85rem' }}>Advance saved successfully!</span>
          </div>
        )}

        {employees.map(emp => {
          const isExpanded = advForm.employee_no === emp.employee_no
          return (
            <div key={emp.employee_no} style={{ background: 'white', borderRadius: '1.5rem', border: `2px solid ${isExpanded ? '#f59e0b' : 'var(--border)'}`, overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: isExpanded ? '0 4px 14px rgba(245,158,11,0.15)' : 'var(--shadow)' }}>
              <div
                onClick={() => setAdvForm(f => f.employee_no === emp.employee_no
                  ? { employee_no: '', amount: '', date: getToday(), reason: '' }
                  : { employee_no: emp.employee_no, amount: '', date: getToday(), reason: '' }
                )}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.1rem 1.25rem', cursor: 'pointer' }}
              >
                <div style={{ width: '3rem', height: '3rem', borderRadius: '0.85rem', background: isExpanded ? 'rgba(245,158,11,0.15)' : 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem', color: isExpanded ? '#f59e0b' : 'var(--secondary)', flexShrink: 0, transition: 'all 0.2s' }}>
                  {getInitial(emp.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.15rem', fontWeight: '800', color: 'var(--secondary)' }}>{emp.name}</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: '700' }}>{emp.category} • {emp.employee_no}</p>
                </div>
                <Wallet style={{ width: '1rem', height: '1rem', color: isExpanded ? '#f59e0b' : '#cbd5e1', transition: 'color 0.2s', flexShrink: 0 }} />
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount (₹)</p>
                      <input
                        type='number'
                        placeholder='Enter Amount'
                        value={advForm.amount}
                        onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', border: '1.5px solid #f59e0b', borderRadius: '0.75rem', padding: '0.6rem 0.8rem', fontSize: '0.95rem', fontWeight: '900', color: 'var(--secondary)', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reason (Optional)</p>
                    <input
                      placeholder='Short reason...'
                      value={advForm.reason}
                      onChange={e => setAdvForm(f => ({ ...f, reason: e.target.value }))}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.6rem 0.8rem', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); submitAdvance() }}
                    disabled={advSubmitting}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', background: '#f59e0b', color: 'white', border: 'none', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(245,158,11,0.2)' }}
                  >
                    {advSubmitting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Save className='w-4 h-4' />}
                    {advSubmitting ? 'SAVING...' : 'GIVE ADVANCE'}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
          <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
          <p style={{ margin: 0, fontWeight: '800', color: 'var(--secondary)', fontSize: '0.95rem' }}>Recent History</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
          {advLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className='w-8 h-8 animate-spin text-amber-500 mx-auto' /></div>
          ) : advances.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Wallet style={{ width: '3rem', height: '3rem', color: '#f59e0b', opacity: 0.5 }} />
              <div>
                <p style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)', fontSize: '1.1rem' }}>No History Yet</p>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>No advance payments have been recorded for this site.</p>
              </div>
            </div>
          ) : advances.map(adv => (
            <div key={adv.id} style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IndianRupee style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ margin: 0, fontWeight: '850', color: 'var(--secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adv.employee_name}</p>
                  <p style={{ margin: 0, fontWeight: '950', color: '#f59e0b', fontSize: '1rem' }}>₹{fmtINR(adv.amount)}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>{fmtDate(adv.date)}{adv.reason ? ` • ${adv.reason}` : ''}</p>
                  <button onClick={() => deleteAdvance(adv.id)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '0.2rem', cursor: 'pointer', opacity: 0.7 }}>
                    <Trash2 style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}
