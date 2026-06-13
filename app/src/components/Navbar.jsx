import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar({ profile, isAdmin }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/dashboard" className="navbar__brand">
          Psych Tests
        </Link>
        <div className="navbar__links">
          <Link to="/dashboard">Inicio</Link>
          {isAdmin && <Link to="/admin">Admin</Link>}
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {profile?.full_name || ''}
          </span>
          <button className="btn btn--ghost" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }} onClick={handleSignOut}>
            Salir
          </button>
        </div>
      </div>
    </nav>
  )
}
