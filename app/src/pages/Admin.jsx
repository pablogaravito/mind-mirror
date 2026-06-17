import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const TABS = [
  { id: 'assignments', label: 'Asignaciones' },
  { id: 'pdf',         label: 'Solicitudes PDF' },
]

export default function Admin() {
  const [tab, setTab] = useState('assignments')

  return (
    <div className="page">
      <div className="container container--wide">
        <div style={{ marginBottom: '2rem' }}>
          <h2>Panel de administración</h2>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.6rem 1.1rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'assignments' && <AssignmentsTab />}
        {tab === 'pdf'         && <PdfRequestsTab />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENTS TAB
// ─────────────────────────────────────────────────────────────
function AssignmentsTab() {
  const [assignments, setAssignments] = useState([])
  const [tests, setTests]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: aData }, { data: tData }] = await Promise.all([
      supabase
        .from('assignments')
        .select('*, assigned_tests(*, tests(name)), profiles:user_id(full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('tests').select('id, name, slug').eq('is_active', true),
    ])
    setAssignments(aData || [])
    setTests(tData || [])
    setLoading(false)
  }

  if (loading) return <div className="spinner" />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          {assignments.length} asignación{assignments.length !== 1 ? 'es' : ''}
        </p>
        <button className="btn btn--primary" onClick={() => setShowForm(true)}>
          + Nueva asignación
        </button>
      </div>

      {showForm && (
        <NewAssignmentForm
          tests={tests}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load() }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {assignments.map(a => (
          <AssignmentCard key={a.id} assignment={a} tests={tests} onUpdate={load} />
        ))}
      </div>

      {assignments.length === 0 && !showForm && (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <p>No hay asignaciones aún. Crea la primera.</p>
        </div>
      )}
    </div>
  )
}

function NewAssignmentForm({ tests, onClose, onCreated }) {
  const [name, setName]           = useState('')
  const [notes, setNotes]         = useState('')
  const [selectedTests, setSelectedTests] = useState([]) // [{ test_id, show_results }]
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function toggleTest(testId) {
    setSelectedTests(prev =>
      prev.find(t => t.test_id === testId)
        ? prev.filter(t => t.test_id !== testId)
        : [...prev, { test_id: testId, show_results: null }]
    )
  }

  function setShowResults(testId, val) {
    setSelectedTests(prev =>
      prev.map(t => t.test_id === testId ? { ...t, show_results: val } : t)
    )
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Ingresa un nombre.'); return }
    if (!selectedTests.length) { setError('Asigna al menos un test.'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const code = generateCode()

    const { data: assignment, error: aErr } = await supabase
      .from('assignments')
      .insert({ display_name: name.trim(), admin_notes: notes.trim() || null, claim_code: code, created_by: user.id })
      .select()
      .single()

    if (aErr) { setError('Error al crear la asignación.'); setLoading(false); return }

    const testRows = selectedTests.map((t, i) => ({
      assignment_id: assignment.id,
      test_id:       t.test_id,
      display_order: i,
      show_results:  t.show_results,
    }))

    const { error: tErr } = await supabase.from('assigned_tests').insert(testRows)
    if (tErr) { setError('Error al asignar tests.'); setLoading(false); return }

    onCreated()
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
      <h3 style={{ color: 'var(--text)', marginBottom: '1.25rem' }}>Nueva asignación</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="field">
          <label>Nombre (referencia interna)</label>
          <input placeholder="Ej. Pepito García" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="field">
          <label>Notas (solo visibles para ti)</label>
          <input placeholder="Ej. Derivado por Dr. Martínez" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>
            Tests a asignar
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tests.map(test => {
              const selected = selectedTests.find(t => t.test_id === test.id)
              return (
                <div key={test.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => toggleTest(test.id)}
                    />
                    {test.name}
                  </label>
                  {selected && (
                    <select
                      value={selected.show_results === null ? 'default' : selected.show_results ? 'yes' : 'no'}
                      onChange={e => setShowResults(test.id, e.target.value === 'default' ? null : e.target.value === 'yes')}
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}
                    >
                      <option value="default">Visibilidad: por defecto</option>
                      <option value="yes">Mostrar resultados al usuario</option>
                      <option value="no">Ocultar resultados al usuario</option>
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn--primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creando...' : 'Crear asignación'}
          </button>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function AssignmentCard({ assignment, tests, onUpdate }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(assignment.claim_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusLabel = {
    pending:   { label: 'Pendiente', cls: 'badge--pending' },
    claimed:   { label: 'Reclamado', cls: 'badge--approved' },
    completed: { label: 'Completado', cls: 'badge--downloaded' },
  }[assignment.status] || { label: assignment.status, cls: '' }

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{assignment.display_name}</span>
            <span className={`badge ${statusLabel.cls}`}>{statusLabel.label}</span>
          </div>
          {assignment.profiles?.full_name && (
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Usuario: <strong>{assignment.profiles.full_name}</strong>
            </p>
          )}
          {assignment.admin_notes && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {assignment.admin_notes}
            </p>
          )}
          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {(assignment.assigned_tests || []).map(at => (
              <span key={at.id} style={{ fontSize: '0.75rem', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                {at.tests?.name}
              </span>
            ))}
          </div>
        </div>

        {/* Code chip */}
        {assignment.status === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '1.4rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'var(--accent)',
              background: 'var(--accent-dim)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius)',
            }}>
              {assignment.claim_code}
            </div>
            <button className="btn btn--ghost" style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }} onClick={copyCode}>
              {copied ? '✓ Copiado' : 'Copiar código'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PDF REQUESTS TAB
// ─────────────────────────────────────────────────────────────
function PdfRequestsTab() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter]     = useState('pending')
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadRequests() }, [filter])

  async function loadRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('pdf_requests')
      .select(`*, profiles:user_id(full_name, birth_date, gender), test_sessions:session_id(completed_at, scores, tests(name))`)
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
    <div>
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
        <div className="card text-center" style={{ padding: '3rem' }}>
          <p>No hay solicitudes {filterOptions.find(f => f.value === filter)?.label.toLowerCase()}.</p>
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(req => (
            <PdfRequestCard key={req.id} req={req} onUpdateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function PdfRequestCard({ req, onUpdateStatus }) {
  const profile     = req.profiles
  const testSession = req.test_sessions

  const requestedDate = new Date(req.requested_at).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{profile?.full_name || '—'}</span>
            <span className={`badge badge--${req.status}`}>
              {req.status === 'pending'    && 'Pendiente'}
              {req.status === 'approved'   && 'Aprobada'}
              {req.status === 'rejected'   && 'Rechazada'}
              {req.status === 'downloaded' && 'Descargada'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
            <strong>Test:</strong> {testSession?.tests?.name || '—'} &nbsp;·&nbsp;
            <strong>Solicitado:</strong> {requestedDate}
          </p>
        </div>

        {req.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <button className="btn btn--primary" style={{ fontSize: '0.875rem' }} onClick={() => onUpdateStatus(req.id, 'approved')}>
              Aprobar
            </button>
            <button className="btn btn--danger" style={{ fontSize: '0.875rem' }} onClick={() => onUpdateStatus(req.id, 'rejected')}>
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
