import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

import Landing     from './pages/Landing'
import Onboarding  from './pages/Onboarding'
import Dashboard   from './pages/Dashboard'
import Test        from './pages/Test'
import Results     from './pages/Results'
import Admin       from './pages/Admin'

import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute     from './components/AdminRoute'
import Navbar         from './components/Navbar'

export default function App() {
  const [session, setSession]   = useState(undefined) // undefined = loading
  const [profile, setProfile]   = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    // Listen for auth changes (login, logout, token refresh)
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

  // Still loading auth state — show nothing to avoid flash
  if (session === undefined) {
    return <div className="spinner" style={{ marginTop: '6rem' }} />
  }

  const isOnboarded = profile?.full_name && profile?.birth_date && profile?.gender
  const isAdmin     = profile?.role === 'admin'

  return (
    <BrowserRouter>
      {session && <Navbar profile={profile} isAdmin={isAdmin} />}
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={session ? <Navigate to="/dashboard" replace /> : <Landing />}
        />

        {/* Auth callback — Supabase redirects here after magic link / OAuth */}
        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />

        {/* Onboarding — logged in but profile not complete */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute session={session}>
              <Onboarding profile={profile} onComplete={fetchProfile} session={session} />
            </ProtectedRoute>
          }
        />

        {/* Dashboard — requires completed profile */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              {!profile ? (
                <div className="spinner" />
              ) : !isOnboarded ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <Dashboard profile={profile} />
              )}
            </ProtectedRoute>
          }
        />

        {/* Test taking */}
        <Route
          path="/test/:slug"
          element={
            <ProtectedRoute session={session}>
              {!isOnboarded ? <Navigate to="/onboarding" replace /> : <Test session={session} />}
            </ProtectedRoute>
          }
        />

        {/* Results */}
        <Route
          path="/results/:sessionId"
          element={
            <ProtectedRoute session={session}>
              <Results session={session} />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute session={session} isAdmin={isAdmin} profile={profile}>
              <Admin />
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Handles the redirect back from Supabase after magic link / Google OAuth
function AuthCallback() {
  useEffect(() => {
    // Supabase JS v2 handles the session from the URL automatically.
    // We just need to redirect the user onward.
    supabase.auth.getSession().then(() => {
      window.location.replace('/dashboard')
    })
  }, [])
  return <div className="spinner" style={{ marginTop: '6rem' }} />
}
