'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XSquare,
  X,
  Search,
  Filter,
  Calendar as CalendarIcon,
  ChevronRight,
  User,
  Clock,
  MapPin,
  CheckDouble,
  Undo2,
  Loader2,
  ArrowRight,
  UserCheck,
  Zap,
  ArrowLeft,
  HardHat
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AttendanceApprovalPage() {
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [pendingList, setPendingList] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)

  useEffect(() => {
    fetchPendingAttendance()
  }, [])

  const fmtINR = (num) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num || 0)
  const getInitial = (name) => name?.charAt(0).toUpperCase() || '?'

  async function fetchPendingAttendance() {
    try {
      setLoading(true)
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('status', 'pending')
        .order('date', { ascending: false })
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
      fetchPendingAttendance()
    } catch (err) {
      console.error('Confirmation error:', err)
    } finally {
      setConfirming(false)
    }
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
            <h2 style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock className="w-4 h-4" /> Pending Queue ({pendingList.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {pendingList.map((item) => (
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
                      <CalendarIcon className="w-3.5 h-3.5" /> {item.date}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                      <User className="w-3.5 h-3.5" /> {item.total_workers} L
                    </div>
                  </div>
                  {/* Submitter Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', padding: '0.4rem 0.65rem', background: '#f8fafc', borderRadius: '0.6rem', border: '1px solid #f1f5f9' }}>
                    <HardHat style={{ width: '12px', height: '12px', color: 'var(--reports-indigo)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: '850', color: 'var(--secondary)', textTransform: 'uppercase' }}>
                      By: {item.engineerName} ({item.engineerNo})
                    </span>
                  </div>
                </button>
              ))}

              {pendingList.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '2rem', border: '1px dashed var(--border)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '1.25rem', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <CheckCircle2 style={{ color: 'var(--attendance-green)', width: '28px', height: '28px' }} />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.25rem' }}>Queue Empty</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>All sitework is currently verified and approved.</p>
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
                  <p style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '750', textTransform: 'uppercase', margin: '0.2rem 0 0', opacity: 0.8 }}>
                    {selectedSubmission.type} Site
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', color: 'var(--brand-light)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    <HardHat style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                    <span>By: {selectedSubmission.engineerName} ({selectedSubmission.engineerNo})</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>

              {/* Action Board (Stacked on Mobile) */}
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, background: 'white', border: '1px solid var(--border)', padding: '0.85rem 1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.62rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Labour</p>
                    <p style={{ fontSize: '1.15rem', fontWeight: '900', margin: 0 }}>{selectedSubmission.total_workers}</p>
                  </div>
                  <div style={{ flex: 1, background: 'white', border: '1px solid var(--border)', padding: '0.85rem 1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.62rem', fontWeight: '950', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Total OT</p>
                    <p style={{ fontSize: '1.15rem', fontWeight: '900', margin: 0, color: '#f59e0b' }}>
                      {selectedSubmission.details.reduce((acc, d) => acc + (parseFloat(d.ot) || 0), 0)}h
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
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', fontWeight: '750', color: 'var(--text-muted)' }}>{row.employee_no} • {row.category}</p>
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
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
