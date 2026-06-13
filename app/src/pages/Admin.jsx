import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Admin() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter]     = useState('pending')
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadRequests() }, [filter])

  async function loadRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('pdf_requests')
      .select(`
        *,
        profiles:user_id (full_name, birth_date, gender),
        test_sessions:session_id (completed_at, scores, tests(name))
      `)
      .eq('status', filter)
      .order('requested_at', { ascending: true })
    setRequests(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('pdf_requests')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    loadRequests()
  }

  const filterOptions = [
    { value: 'pending',    label: 'Pendientes' },
    { value: 'approved',   label: 'Aprobadas' },
    { value: 'rejected',   label: 'Rechazadas' },
    { value: 'downloaded', label: 'Descargadas' },
  ]

  return (
    <div className="page">
      <div className="container container--wide">

        <div style={{ marginBottom: '2rem' }}>
          <h2>Panel de administración</h2>
          <p className="mt-1">Gestiona las solicitudes de informes PDF.</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              className={`btn ${filter === opt.value ? 'btn--primary' : 'btn--outline'}`}
              style={{ fontSize: '0.875rem', padding: '0.45rem 1rem' }}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading && <div className="spinner" />}

        {!loading && requests.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>No hay solicitudes {filterOptions.find(f => f.value === filter)?.label.toLowerCase()}.</p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map(req => (
              <RequestCard key={req.id} req={req} onUpdateStatus={updateStatus} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function RequestCard({ req, onUpdateStatus }) {
  const profile     = req.profiles
  const testSession = req.test_sessions
  const testName    = testSession?.tests?.name || '—'

  const requestedDate = new Date(req.requested_at).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const completedDate = testSession?.completed_at
    ? new Date(testSession.completed_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>

        {/* User + test info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              {profile?.full_name || 'Usuario desconocido'}
            </span>
            <span className={`badge badge--${req.status}`}>
              {req.status === 'pending'    && 'Pendiente'}
              {req.status === 'approved'   && 'Aprobada'}
              {req.status === 'rejected'   && 'Rechazada'}
              {req.status === 'downloaded' && 'Descargada'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
            <strong>Test:</strong> {testName} &nbsp;·&nbsp;
            <strong>Completado:</strong> {completedDate}
          </p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
            <strong>Solicitado:</strong> {requestedDate}
          </p>
          {profile?.gender && (
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
              <strong>Género:</strong> {profile.gender} &nbsp;·&nbsp;
              <strong>Nacimiento:</strong> {profile.birth_date || '—'}
            </p>
          )}
        </div>

        {/* Actions */}
        {req.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <button
              className="btn btn--primary"
              style={{ fontSize: '0.875rem' }}
              onClick={() => onUpdateStatus(req.id, 'approved')}
            >
              Aprobar
            </button>
            <button
              className="btn btn--danger"
              style={{ fontSize: '0.875rem' }}
              onClick={() => onUpdateStatus(req.id, 'rejected')}
            >
              Rechazar
            </button>
          </div>
        )}

      </div>

      {/* Score summary */}
      {testSession?.scores && (
        <ScoreSummary scores={testSession.scores} />
      )}
    </div>
  )
}

function ScoreSummary({ scores }) {
  const domains = Object.entries(scores).filter(([, v]) => v.type === 'domain')
  if (!domains.length) return null

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      {domains.map(([slug, score]) => (
        <div key={slug} style={{ fontSize: '0.8rem', background: 'var(--accent-dim)', borderRadius: '6px', padding: '0.3rem 0.65rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{score.display_name || slug}: </span>
          <strong style={{ color: 'var(--accent)' }}>p{score.percentile}</strong>
        </div>
      ))}
    </div>
  )
}
