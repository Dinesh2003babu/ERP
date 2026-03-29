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
  Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SitesPage() {
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')

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

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.type.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeFilter === 'ALL') return matchesSearch
    return matchesSearch && site.status?.toUpperCase() === activeFilter
  })

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
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)', whiteSpace: 'nowrap' }}>
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
            {['ALL', 'ACTIVE', 'COMPLETED', 'INACTIVE'].map((f) => (
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
      <div className="construction-table-container">
        <table className="construction-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Project Type</th>
              <th>Current Status</th>
              <th>Assigned Engineer</th>
              <th>Avg. Labour</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSites.map((site, idx) => (
              <tr key={`${site.location}-${site.type}`}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '0.75rem' }}>
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <span style={{ fontWeight: '800', color: 'var(--secondary)' }}>{site.location}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span style={{ fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{site.type}</span>
                  </div>
                </td>
                <td>
                  <span className={`status-pill ${site.status === 'active' ? 'active' : site.status === 'completed' ? 'completed' : 'inactive'}`}>
                    {site.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--secondary)' }}>
                    {site.engineer}
                  </span>
                </td>
                <td style={{ fontWeight: '700', color: 'var(--secondary)' }}>{site.workforce} Labour</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '0.75rem' }}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '0.75rem', color: 'var(--error)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSites.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">
                  No active or completed sites found in the database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    </div>
  )
}
