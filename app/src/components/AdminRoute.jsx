import { Navigate } from 'react-router-dom'

export default function AdminRoute({ session, isAdmin, profile, children }) {
  if (!session) return <Navigate to="/" replace />
  // Wait for profile to load before deciding
  if (!profile) return <div className="spinner" />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
