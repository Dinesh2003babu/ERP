'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  HardHat,
  Lock,
  User,
  ArrowRight,
  Loader2,
  ChevronRight,
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Building2,
  Users2,
  Calendar
} from 'lucide-react'


// ─────────────────────────────────────────────────────────
// 🌟 SUB-COMPONENT: SPLASH SCREEN
// ─────────────────────────────────────────────────────────
const SplashScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)',
    color: 'white',
    gap: '2rem'
  }}>

    {/* Logo Icon Box */}
    <div
      className="animate-splash"
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.25)',
        padding: '2rem',
        borderRadius: '2rem',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)'
      }}
    >
      <img src="/favicon.ico" alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
    </div>

    {/* Brand Text */}
    <div className="animate-splash-text" style={{ textAlign: 'center' }}>
      <h1 style={{
        fontSize: '3.5rem',
        fontWeight: '900',
        letterSpacing: '-0.05em',
        margin: 0
      }}>
        PS INFRA
      </h1>
      <p style={{
        color: 'var(--brand)',
        fontWeight: '950',
        textTransform: 'uppercase',
        letterSpacing: '0.4em',
        fontSize: '0.75rem',
        marginTop: '0.5rem'
      }}>
        Building the Future
      </p>
    </div>

  </div>
)


// ─────────────────────────────────────────────────────────
// 🏠 SUB-COMPONENT: HOME DASHBOARD
// ─────────────────────────────────────────────────────────
const HomeDashboard = ({ onEnterPortal }) => {
  const [siteStats, setSiteStats] = useState({ sites: '...', workers: '...', active: '...' })

  useEffect(() => {
    async function fetchPublicStats() {
      try {
        const [sitesRes, empRes, attRes] = await Promise.all([
          supabase.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('attendance').select('location, type, date').eq('status', 'pending')
        ])

        // Unique sites with pending work
        const liveSitesCount = new Set((attRes.data || []).map(row => `${row.location}-${row.type}-${row.date}`)).size

        setSiteStats({
          sites: sitesRes.count?.toString() || '0',
          workers: empRes.count?.toString() || '0',
          active: liveSitesCount.toString()
        })
      } catch (err) {
        console.error('Landing Stats Error:', err)
      }
    }
    fetchPublicStats()
  }, [])

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column'
      }}
    >

      {/* ── Hero Section ── */}
      <div
        className="home-hero-bg"
        style={{
          padding: '6rem 2rem 10rem 2rem',
          textAlign: 'center',
          color: 'white'
        }}
      >
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10
        }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(255,255,255,0.1)',
            padding: '0.5rem 1.25rem',
            borderRadius: '2rem',
            marginBottom: '2rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <ShieldCheck style={{
              width: '16px',
              height: '16px',
              color: '#38bdf8'
            }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Premium ERP Solution
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '900',
            letterSpacing: '-0.03em',
            margin: '0 0 1.5rem 0',
            lineHeight: 1
          }}>
            Streamlining Civil <span style={{ color: '#f59e0b' }}>Construction</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.15rem',
            color: '#cbd5e1',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.65,
            fontWeight: '400'
          }}>
            Accurate labor tracking, instant attendance, and real-time financial
            reporting for large-scale infrastructure projects.
          </p>

        </div>

        {/* Decorative Blobs */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '-10%',
          width: '400px',
          height: '400px',
          background: 'var(--primary)',
          opacity: 0.05,
          borderRadius: '50%',
          filter: 'blur(100px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '500px',
          height: '500px',
          background: '#3b82f6',
          opacity: 0.05,
          borderRadius: '50%',
          filter: 'blur(100px)'
        }} />

      </div>


      {/* ── Stats Recap ── */}
      <div style={{
        maxWidth: '1000px',
        width: '100%',
        margin: '-5rem auto 0 auto',
        padding: '0 2rem',
        position: 'relative',
        zIndex: 20
      }}>
        <div
          className="glass-dashboard stats-recap-grid"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            padding: '1.25rem 1rem',
            borderRadius: '2rem',
            gap: 0
          }}
        >
          <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.5rem' }}>
            <Building2 style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
            <p style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>Active Sites</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0, color: 'var(--secondary)', lineHeight: 1 }}>{siteStats.sites}</p>
          </div>
          <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.5rem' }}>
            <Users2 style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
            <p style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>Workforce</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0, color: 'var(--secondary)', lineHeight: 1 }}>{siteStats.workers}</p>
          </div>
          <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.5rem' }}>
            <Calendar style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
            <p style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>Live Sites</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0, color: 'var(--secondary)', lineHeight: 1 }}>{siteStats.active}</p>
          </div>
        </div>
      </div>


      {/* ── Role Selection ── */}
      <div style={{
        maxWidth: '1000px',
        width: '100%',
        margin: '4rem auto',
        padding: '0 2rem'
      }}>

        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            margin: 0,
            color: 'var(--secondary)'
          }}>
            Portal Access
          </h2>
          <p style={{
            color: 'var(--text-muted)',
            marginTop: '0.5rem',
            fontWeight: '600'
          }}>
            Select your gateway to management operations.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem'
        }}>

          {/* Card: Site Engineer */}
          <div
            onClick={() => onEnterPortal()}
            className="stat-card role-card-hover"
            style={{
              cursor: 'pointer',
              padding: '3rem',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '2.5rem'
            }}
          >
            <div style={{
              background: 'var(--primary)',
              color: 'var(--secondary)',
              padding: '1rem',
              borderRadius: '1.25rem'
            }}>
              <ClipboardCheck style={{ width: '32px', height: '32px' }} />
            </div>

            <div>
              <h3 style={{
                textAlign: 'center',
                fontSize: '1.75rem',
                fontWeight: '900',
                margin: '0 0 0.75rem 0',
                color: 'var(--secondary)'
              }}>
                Site Engineer
              </h3>
              {/* <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                margin: 0,
                fontWeight: '500'
              }}>
                Site-level execution: mark daily attendance, track worker OT hours,
                and sync progress with the head office.
              </p> */}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--primary)',
              fontWeight: '800',
              marginTop: '1rem'
            }}>
              <span>GO TO PORTAL</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card: Administrator */}
          <div
            onClick={() => onEnterPortal()}
            className="stat-card role-card-hover"
            style={{
              cursor: 'pointer',
              padding: '3rem',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '2.5rem'
            }}
          >
            <div style={{
              background: 'var(--secondary)',
              color: 'white',
              padding: '1rem',
              borderRadius: '1.25rem'
            }}>
              <LayoutDashboard style={{ width: '2rem', height: '2rem' }} />
            </div>

            <div>
              <h3 style={{
                textAlign: 'center',
                fontSize: '1.75rem',
                fontWeight: '900',
                margin: '0 0 0.75rem 0',
                color: 'var(--secondary)'
              }}>
                Admin
              </h3>
              {/* <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                margin: 0,
                fontWeight: '500'
              }}>
                Full system oversight: manage projects, verify site costs,
                approve labor attendance, and generate business reports.
              </p> */}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--primary)',
              fontWeight: '800',
              // marginTop: '1rem'
            }}>
              <span>ENTER HUB</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

        </div>
      </div>


      {/* ── Footer ── */}
      <footer style={{
        marginTop: 'auto',
        padding: '4rem 2rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          &copy; {new Date().getFullYear()} PS INFRA Construction ERP. Built for Excellence.
        </p>
      </footer>

    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 🔐 SUB-COMPONENT: LOGIN PAGE
// ─────────────────────────────────────────────────────────
const LoginForm = ({ onBack }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single()

      if (queryError || !data) {
        throw new Error('Invalid username or password')
      }

      // Save session to localStorage
      localStorage.setItem('user_role', data.role)
      localStorage.setItem('user_id', data.id)
      if (data.location) localStorage.setItem('user_location', data.location)

      // Redirect based on role
      if (data.role === 'admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/engineer-portal'
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="animate-fade-in"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ede9fe 100%)',
        padding: '1.5rem'
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            fontWeight: '800',
            marginBottom: '2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ChevronRight style={{ transform: 'rotate(180deg)', width: '16px' }} />
          BACK TO HOME
        </button>

        {/* Login Card */}
        <div style={{
          width: '100%',
          background: 'white',
          backdropFilter: 'blur(20px)',
          borderRadius: '2.5rem',
          border: '1px solid var(--border)',
          padding: '3rem 2rem',
          boxShadow: '0 20px 60px rgba(14, 165, 233, 0.15), 0 4px 20px rgba(0,0,0,0.06)'
        }}>

          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              background: '#f59e0b',
              width: '56px',
              height: '56px',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}>
              <HardHat className="w-8 h-8 text-slate-900" />
            </div>
            <h1 style={{
              color: 'var(--secondary)',
              fontSize: '2rem',
              fontWeight: '900',
              letterSpacing: '-0.03em',
              margin: 0
            }}>
              Secure Login
            </h1>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >

            {/* Username Field */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <label style={{
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginLeft: '0.5rem'
              }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute',
                  left: '1.25rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#f59e0b',
                  width: '18px',
                  height: '18px'
                }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Username"
                  required
                  style={{
                    width: '100%',
                    padding: '1.1rem 1rem 1.1rem 3.5rem',
                    borderRadius: '1.25rem',
                    background: '#f8fafc',
                    border: '1.5px solid var(--border)',
                    color: 'var(--secondary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <label style={{
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginLeft: '0.5rem'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute',
                  left: '1.25rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#f59e0b',
                  width: '18px',
                  height: '18px'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '1.1rem 1rem 1.1rem 3.5rem',
                    borderRadius: '1.25rem',
                    background: '#f8fafc',
                    border: '1.5px solid var(--border)',
                    color: 'var(--secondary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: '600',
                textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.75rem',
                borderRadius: '1rem'
              }}>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1.25rem',
                marginTop: '1rem',
                background: loading ? 'var(--border)' : 'var(--brand)',
                color: 'white',
                borderRadius: '1.25rem',
                fontWeight: '900',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 6px 20px rgba(14, 165, 233, 0.35)'
              }}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>SIGN IN</span>}
            </button>

          </form>
        </div>
      </div>
    </main>
  )
}


// ─────────────────────────────────────────────────────────
// 🚪 MAIN PAGE — Handles Stage Routing
// ─────────────────────────────────────────────────────────
export default function MainPage() {
  const [stage, setStage] = useState('splash')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Auto-advance from splash → home after 3 seconds
    if (stage === 'splash') {
      const timer = setTimeout(() => {
        setStage('home')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [stage])

  if (!mounted) return null

  if (stage === 'splash') return <SplashScreen />
  if (stage === 'home') return <HomeDashboard onEnterPortal={() => setStage('login')} />
  if (stage === 'login') return <LoginForm onBack={() => setStage('home')} />

  return null
}
