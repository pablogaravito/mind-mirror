import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

import Landing    from './pages/Landing'
import Onboarding from './pages/Onboarding'
import ClaimCode  from './pages/ClaimCode'
import Dashboard  from './pages/Dashboard'
import Test       from './pages/Test'
import Results    from './pages/Results'
import Admin      from './pages/Admin'

import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute     from './components/AdminRoute'
import Navbar         from './components/Navbar'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  if (session === undefined) return <div className="spinner" style={{ marginTop: '6rem' }} />

  const isOnboarded = profile?.full_name && profile?.birth_date && profile?.gender
  const isAdmin     = profile?.role === 'admin'

  return (
    <BrowserRouter>
      {session && <Navbar profile={profile} isAdmin={isAdmin} />}
      <Routes>

        <Route
          path="/"
          element={session ? <Navigate to="/dashboard" replace /> : <Landing />}
        />

        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute session={session}>
              <Onboarding
                profile={profile}
                onComplete={fetchProfile}
                session={session}
                redirectTo={isAdmin ? '/dashboard' : '/claim'}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/claim"
          element={
            <ProtectedRoute session={session}>
              {!profile ? (
                <div className="spinner" />
              ) : !isOnboarded ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <ClaimCode profile={profile} session={session} />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              {!profile ? (
                <div className="spinner" />
              ) : !isOnboarded ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <Dashboard profile={profile} isAdmin={isAdmin} />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/test/:slug"
          element={
            <ProtectedRoute session={session}>
              {!isOnboarded ? <Navigate to="/onboarding" replace /> : <Test session={session} />}
            </ProtectedRoute>
          }
        />

        <Route
          path="/test/:slug/resume/:sessionId"
          element={
            <ProtectedRoute session={session}>
              <Test session={session} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results/:sessionId"
          element={
            <ProtectedRoute session={session}>
              <Results session={session} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute session={session} isAdmin={isAdmin} profile={profile}>
              <Admin />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      window.location.replace('/dashboard')
    })
  }, [])
  return <div className="spinner" style={{ marginTop: '6rem' }} />
}
