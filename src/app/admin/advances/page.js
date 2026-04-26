'use client'

import { useState, useEffect } from 'react'
import {
  Wallet,
  Search,
  MapPin,
  Users,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  ArrowLeft,
  Calendar,
  IndianRupee,
  Briefcase
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminAdvances() {
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)

  // Selection state
  const [employees, setEmployees] = useState([])
  const [advances, setAdvances] = useState([])
  const [fetchingEmployees, setFetchingEmployees] = useState(false)

  // Form state
  const [advForm, setAdvForm] = useState({ employee_no: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchSites()
  }, [])

  async function fetchSites() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('status', 'active')
        .order('location')
      if (error) throw error
      setSites(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSiteSelect(site) {
    setSelectedSite(site)
    setFetchingEmployees(true)
    try {
      const [empRes, advRes] = await Promise.all([
        supabase
          .from('employees')
          .select('*')
          .eq('location', site.location)
          .eq('type', site.type)
          .eq('status', 'active')
          .order('employee_no'),
        supabase
          .from('advances')
          .select('*')
          .eq('location', site.location)
          .eq('type', site.type)
          .order('date', { ascending: false })
      ])

      const activeEmpNos = new Set((empRes.data || []).map(e => e.employee_no))
      const filteredAdvances = (advRes.data || []).filter(a => activeEmpNos.has(a.employee_no))

      setEmployees(empRes.data || [])
      setAdvances(filteredAdvances)
    } catch (err) {
      console.error(err)
    } finally {
      setFetchingEmployees(false)
    }
  }

  async function submitAdvance() {
    if (!advForm.employee_no || !advForm.amount || submitting) return
    const emp = employees.find(e => e.employee_no === advForm.employee_no)
    setSubmitting(true)
    try {
      const { error } = await supabase.from('advances').insert({
        employee_no: advForm.employee_no,
        employee_name: emp?.name || '',
        amount: Number(advForm.amount),
        date: advForm.date,
        reason: advForm.reason || null,
        location: selectedSite.location,
        type: selectedSite.type,
        given_by: 'Admin'
      })
      if (error) throw error

      setAdvForm({ employee_no: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Refresh advances and filter for active employees only
      const { data } = await supabase
        .from('advances')
        .select('*')
        .eq('location', selectedSite.location)
        .eq('type', selectedSite.type)
        .order('date', { ascending: false })
      
      const activeEmpNos = new Set(employees.map(e => e.employee_no))
      setAdvances((data || []).filter(a => activeEmpNos.has(a.employee_no)))
    } catch (err) {
      alert('Failed to save advance: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteAdvance(id) {
    if (!confirm('Delete this advance record?')) return
    try {
      await supabase.from('advances').delete().eq('id', id)
      setAdvances(advances.filter(a => a.id !== id))
    } catch (err) {
      alert('Delete failed')
    }
  }

  function fmtINR(val) {
    return new Intl.NumberFormat('en-IN').format(val)
  }

  if (loading) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontWeight: '900', color: 'var(--secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wallet style={{ color: '#f59e0b' }} /> Labour Advances
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage and track worker advance payments across sites.</p>
        </div>
      </div>

      {!selectedSite ? (
        /* Site Selection Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {sites.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <MapPin style={{ width: '48px', height: '48px', color: 'var(--text-muted)', opacity: 0.5 }} />
              <div>
                <p style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)', fontSize: '1.1rem' }}>No Active Sites</p>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>There are no active construction sites to manage advances for.</p>
              </div>
            </div>
          ) : sites.map((site, idx) => (
            <button
              key={`${site.location}-${site.type}-${idx}`}
              onClick={() => handleSiteSelect(site)}
              style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.5rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: '1rem' }}
              className="role-card-hover"
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--secondary)' }}>{site.location}</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{site.type}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Site Specific Advance View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Sub Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSelectedSite(null)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)' }}>{selectedSite.location} <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>• {selectedSite.type}</span></h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

            {/* Left Col: Employee List & Give Advance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid var(--border)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle style={{ width: '20px', height: '20px', color: 'var(--brand)' }} /> Give New Advance
                </h3>

                {success && (
                  <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--attendance-green)', padding: '1rem', borderRadius: '1rem', marginBottom: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 className="w-5 h-5" /> Saved successfully!
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Select Worker</label>
                    <select
                      value={advForm.employee_no}
                      onChange={e => setAdvForm({ ...advForm, employee_no: e.target.value })}
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '1rem', border: '1.5px solid var(--border)', fontWeight: '700', outline: 'none' }}
                    >
                      <option value="">Choose a worker...</option>
                      {employees.map(e => <option key={e.employee_no} value={e.employee_no}>{e.name} ({e.employee_no})</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Amount (₹)</label>
                      <input
                        type="number"
                        value={advForm.amount}
                        onChange={e => setAdvForm({ ...advForm, amount: e.target.value })}
                        style={{ width: '100%', padding: '0.875rem', borderRadius: '1rem', border: '1.5px solid var(--border)', fontWeight: '700', outline: 'none' }}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Date</label>
                      <input
                        type="date"
                        value={advForm.date}
                        onChange={e => setAdvForm({ ...advForm, date: e.target.value })}
                        style={{ width: '100%', padding: '0.875rem', borderRadius: '1rem', border: '1.5px solid var(--border)', fontWeight: '700', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Reason / Notes</label>
                    <input 
                      type="text" 
                      value={advForm.reason} 
                      onChange={e => setAdvForm({...advForm, reason: e.target.value})}
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '1rem', border: '1.5px solid var(--border)', fontWeight: '700', outline: 'none' }}
                      placeholder="Optional reason..."
                    />
                  </div> */}

                  <button
                    onClick={submitAdvance}
                    disabled={submitting}
                    style={{ width: '100%', padding: '1rem', borderRadius: '1rem', background: '#f59e0b', color: 'white', border: 'none', fontWeight: '900', cursor: 'pointer', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 8px 16px rgba(245,158,11,0.25)' }}
                  >
                    {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                    {submitting ? 'Saving...' : 'Save Advance Record'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Advance History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Total Site Advance Summary */}
              <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '1.5rem', padding: '1.5rem', color: 'white', boxShadow: '0 8px 24px rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee className="w-7 h-7" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase' }}>Total Site Advances</p>
                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900' }}>₹{fmtINR(advances.reduce((s, a) => s + Number(a.amount), 0))}</p>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontWeight: '800' }}>History</h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>{advances.length} records</span>
                </div>

                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {advances.length === 0 ? (
                    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <Wallet style={{ width: '40px', height: '40px', color: 'var(--text-muted)', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No advance history for this site.</p>
                    </div>
                  ) : advances.map(adv => (
                    <div key={adv.id} style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--secondary)', flexShrink: 0 }}>
                        {adv.employee_name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '800', color: 'var(--secondary)', fontSize: '0.9rem' }}>{adv.employee_name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>{new Date(adv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {adv.reason || 'No reason'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontWeight: '900', color: '#f59e0b' }}>₹{fmtINR(adv.amount)}</p>
                        <button onClick={() => deleteAdvance(adv.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.25rem' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
