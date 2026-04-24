'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  Plus,
  MapPin,
  Layers,
  MoreVertical,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Loader2,
  Download,
  X,
  RotateCcw,
  ArrowLeft,
  User,
  Users
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SitesPage() {
  const VIEW_ROSTER = 'ROSTER'
  const VIEW_PROFILE = 'PROFILE'
  const [view, setView] = useState(VIEW_ROSTER)
  const [selectedSite, setSelectedSite] = useState(null)

  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')

  // Add Site State
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSite, setNewSite] = useState({ location: '', type: 'Commercial', status: 'active' })

  useEffect(() => {
    fetchSites()
  }, [])

  async function fetchSites() {
    try {
      setLoading(true)

      // 1. Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .order('location', { ascending: true })

      if (sitesError) throw sitesError

      // 2. Fetch all employees to calculate workforce
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('location, type')

      if (empError) throw empError

      // 3. Fetch Assigned Engineers from profiles and resolve their names
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('location, type, username')
        .eq('role', 'engineer')

      if (profError) throw profError

      const { data: engData, error: engError } = await supabase
        .from('engineers')
        .select('engineer_no, name')

      if (engError) throw engError

      // Build lookup maps
      const engNameMap = (engData || []).reduce((acc, e) => ({ ...acc, [e.engineer_no]: e.name }), {})

      const siteEngineerMap = (profData || []).reduce((acc, p) => {
        const key = `${p.location}-${p.type}`
        acc[key] = engNameMap[p.username] || p.username || 'Unassigned'
        return acc
      }, {})

      // Calculate workforce per site
      const workforceMap = (empData || []).reduce((acc, emp) => {
        const key = `${emp.location}-${emp.type}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

      // Map everything
      const enrichedSites = (sitesData || []).map(site => ({
        ...site,
        workforce: workforceMap[`${site.location}-${site.type}`] || 0,
        engineer: siteEngineerMap[`${site.location}-${site.type}`] || 'Unassigned'
      }))

      setSites(enrichedSites)
    } catch (err) {
      console.error('Error fetching sites:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSite(e) {
    e.preventDefault()
    try {
      const { error } = await supabase.from('sites').insert([newSite])
      if (error) throw error
      setShowAddSite(false)
      setNewSite({ location: '', type: 'Commercial', status: 'active' })
      fetchSites()
    } catch (err) {
      alert('Error adding site: ' + err.message)
    }
  }

  async function handleDeleteSite(location, type) {
    if (!window.confirm(`Are you sure you want to mark the site "${location}" as inactive?`)) return;
    try {
      const { error } = await supabase.from('sites').update({ status: 'inactive' }).match({ location, type })
      if (error) throw error
      setView(VIEW_ROSTER)
      fetchSites()
    } catch (err) {
      alert("Error deactivating site: " + err.message)
    }
  }

  async function handleRestoreSite(location, type) {
    if (!window.confirm(`Are you sure you want to restore the site "${location}" to active status?`)) return;
    try {
      const { error } = await supabase.from('sites').update({ status: 'active' }).match({ location, type })
      if (error) throw error
      setView(VIEW_ROSTER)
      fetchSites()
    } catch (err) {
      alert("Error restoring site: " + err.message)
    }
  }

  async function handlePermanentDeleteSite(location, type) {
    if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete the site "${location}"? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('sites').delete().match({ location, type })
      if (error) throw error
      setView(VIEW_ROSTER)
      fetchSites()
    } catch (err) {
      alert("Error permanently deleting site: " + err.message)
    }
  }

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.type.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeFilter === 'ALL') return matchesSearch
    return matchesSearch && site.status?.toUpperCase() === activeFilter
  }).sort((a, b) => {
    if (a.status === 'inactive' && b.status !== 'inactive') return 1;
    if (a.status !== 'inactive' && b.status === 'inactive') return -1;
    return 0;
  })

  if (loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  if (view === VIEW_PROFILE && selectedSite) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <button onClick={() => setView(VIEW_ROSTER)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
            <ArrowLeft style={{ width: '18px', height: '18px', color: 'var(--secondary)' }} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--secondary)', fontSize: '1.25rem' }}>{selectedSite.location}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase' }}>{selectedSite.type}</p>
          </div>
          {selectedSite.status === 'inactive' ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button title="Restore" onClick={() => handleRestoreSite(selectedSite.location, selectedSite.type)} style={{ background: '#dcfce7', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#16a34a' }}>
                <RotateCcw style={{ width: '18px', height: '18px' }} />
              </button>
              <button title="Permanently Delete" onClick={() => handlePermanentDeleteSite(selectedSite.location, selectedSite.type)} style={{ background: '#fee2e2', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                <Trash2 style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          ) : (
            <button title="Move to Inactive" onClick={() => handleDeleteSite(selectedSite.location, selectedSite.type)} style={{ background: '#fee2e2', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
              <Trash2 style={{ width: '18px', height: '18px' }} />
            </button>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          
          <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '0.75rem' }}>
                <CheckCircle2 style={{ width: '18px', height: '18px', color: '#16a34a' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Project Status</p>
                <p style={{ margin: '0.1rem 0 0', fontWeight: '900', color: 'var(--secondary)', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                  {selectedSite.status || 'Active'}
                </p>
              </div>
            </div>
            <span className={`status-pill ${selectedSite.status === 'active' ? 'active' : selectedSite.status === 'completed' ? 'completed' : 'inactive'}`}>
              {selectedSite.status?.toUpperCase() || 'ACTIVE'}
            </span>
          </div>

          <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
             <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '0.75rem' }}>
                <User style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
             </div>
             <div>
               <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Engineer</p>
               <p style={{ margin: '0.1rem 0 0', fontWeight: '900', color: 'var(--secondary)', fontSize: '0.95rem' }}>
                 {selectedSite.engineer || 'Unassigned'}
               </p>
             </div>
          </div>

          <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ background: '#fffbeb', padding: '0.6rem', borderRadius: '0.75rem' }}>
                <Users style={{ width: '18px', height: '18px', color: '#d97706' }} />
             </div>
             <div>
               <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Labour</p>
               <p style={{ margin: '0.1rem 0 0', fontWeight: '900', color: 'var(--secondary)', fontSize: '0.95rem' }}>
                 {selectedSite.workforce} <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Workers</span>
               </p>
             </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--secondary)', margin: 0, display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <Building2 style={{ color: 'var(--sites-amber)', width: '32px', height: '32px' }} />
          Construction Sites
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Centrally manage project locations and structure.</p>
      </div>

      {/* Toolbar - Multi-Row Professional Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Row 1: Add New + Search + Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--brand-light)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--brand)', display: 'flex', alignItems: 'center', height: '44px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '950', color: 'var(--brand-dark)', whiteSpace: 'nowrap' }}>
              {filteredSites.length} {filteredSites.length === 1 ? 'SITE' : 'SITES'} FOUND
            </span>
          </div>
          <button onClick={() => setShowAddSite(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)', whiteSpace: 'nowrap' }}>
            <Plus className="w-5 h-5" />
            <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>ADD NEW SITE</span>
          </button>

          <div style={{ flex: 1, position: 'relative', minWidth: '250px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: '18px' }} />
            <input
              type="text"
              placeholder="Search project locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '3rem', width: '100%', height: '44px' }}
            />
          </div>

          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'white', border: '1.5px solid var(--border)', fontWeight: '800', height: '44px' }}
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
              <span style={{ fontSize: '0.75rem' }}>EXPORT</span>
            </button>
            <div style={{ background: 'var(--brand-light)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--brand)', display: 'flex', alignItems: 'center', height: '44px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '950', color: 'var(--brand-dark)', whiteSpace: 'nowrap' }}>
                {filteredSites.length} {filteredSites.length === 1 ? 'SITE' : 'SITES'} FOUND
              </span>
            </div>
          </div> */}
        </div>

        {/* Row 2: Filters */}
        <div style={{ justifyContent: 'center', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'white', padding: '0.4rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            {['ALL', 'ACTIVE', 'INACTIVE', 'COMPLETED'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.7rem',
                  fontWeight: '900',
                  background: activeFilter === f ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.75rem',
                  color: activeFilter === f ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Sites Listing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filteredSites.map((site) => (
          <button
            key={`${site.location}-${site.type}`}
            onClick={() => { setSelectedSite(site); setView(VIEW_PROFILE); }}
            style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.15rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow)', opacity: site.status === 'inactive' ? 0.6 : 1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontWeight: '900', color: 'var(--secondary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {site.location}
                  {site.status === 'inactive' && <span style={{ background: '#fee2e2', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '0.5rem', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.05em' }}>INACTIVE</span>}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span style={{ fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{site.type}</span>
                </div>
              </div>
            </div>
            {site.status === 'completed' && (
              <span className="status-pill completed" style={{ fontSize: '0.62rem' }}>
                COMPLETED
              </span>
            )}
          </button>
        ))}
        {filteredSites.length === 0 && (
          <div className="empty-state">No sites found.</div>
        )}
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '1rem' }}>
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Project Load</p>
            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900' }}>{sites.length} Active Locations</p>
          </div>
        </div>
      </div>

      {/* Add Site Modal */}
      {showAddSite && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '1.5rem', width: '100%', maxWidth: '450px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <h2 style={{ margin: 0, color: 'var(--secondary)', fontWeight: '900', fontSize: '1.5rem' }}>Add New Site</h2>
              <button onClick={() => setShowAddSite(false)} style={{ background: '#f8fafc', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <X style={{ color: 'var(--text-muted)', width: '20px', height: '20px' }} />
              </button>
            </div>
            <form onSubmit={handleAddSite} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Site Location / Name</p>
                <input required placeholder="Enter site name" value={newSite.location} onChange={e => setNewSite({ ...newSite, location: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', fontSize: '0.95rem' }} />
              </div>

              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Project Type</p>
                <select value={newSite.type} onChange={e => setNewSite({ ...newSite, type: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', fontSize: '0.95rem', background: 'white' }}>
                  <option value="Commercial">Commercial</option>
                  <option value="Residential">Residential</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '1rem', marginTop: '0.5rem', borderRadius: '0.85rem', fontWeight: '900', fontSize: '1rem', letterSpacing: '0.05em', background: 'var(--sites-amber)', border: 'none' }}>
                SAVE SITE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
