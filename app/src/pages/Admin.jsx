import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const TABS = [
  { id: 'assignments', label: 'Asignaciones' },
  { id: 'results',     label: 'Resultados' },
  { id: 'tests',       label: 'Tests' },
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
        <div style={{
          display: 'flex', gap: '0', marginBottom: '2rem',
          borderBottom: '1px solid var(--border)',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none',
                padding: '0.6rem 1.1rem', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px', transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'assignments' && <AssignmentsTab />}
        {tab === 'results'     && <ResultsTab />}
        {tab === 'tests'       && <TestsTab />}
        {tab === 'pdf'         && <PdfRequestsTab />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RESULTADOS TAB — list of completed sessions
// ─────────────────────────────────────────────────────────────
function ResultsTab() {
  const navigate        = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('test_sessions')
        .select('id, completed_at, scores, status, tests(name, slug), profiles:user_id(full_name)')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="spinner" />

  if (!sessions.length) return (
    <div className="card text-center" style={{ padding: '3rem' }}>
      <p>No hay sesiones completadas aún.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {sessions.map(sess => {
        const date = sess.completed_at
          ? new Date(sess.completed_at).toLocaleDateString('es-PE', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
          : '—'

        // Extract domain scores for quick preview
        const scores  = sess.scores || {}
        const domains = Object.values(scores).filter(s => s.type === 'domain')

        return (
          <div
            key={sess.id}
            className="card"
            style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => navigate(`/admin/session/${sess.id}`)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {sess.profiles?.full_name || 'Usuario'}
                </span>
                <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {sess.tests?.name}
                </span>
                <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{date}</p>
              </div>

              {/* Domain score pills */}
              {domains.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {domains.map(d => (
                    <span
                      key={d.scale_id}
                      style={{
                        fontSize: '0.75rem',
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '99px',
                        fontWeight: 500,
                      }}
                    >
                      {d.display_name}: p{d.percentile}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TESTS TAB — global test settings (Phase 1)
// ─────────────────────────────────────────────────────────────
function TestsTab() {
  const [tests, setTests]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null) // test id being saved

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tests')
        .select('id, name, slug, is_active, report_config, display_config')
        .order('id')
      setTests(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateTest(testId, field, value) {
    setSaving(testId)
    const test = tests.find(t => t.id === testId)

    let update = {}
    if (field === 'is_active') {
      update = { is_active: value }
    } else if (field === 'show_results_to_user') {
      update = { report_config: { ...test.report_config, show_results_to_user: value } }
    } else if (field === 'pdf_available') {
      update = { report_config: { ...test.report_config, pdf_available: value } }
    }

    await supabase.from('tests').update(update).eq('id', testId)
    setTests(prev => prev.map(t => {
      if (t.id !== testId) return t
      if (field === 'is_active') return { ...t, is_active: value }
      return { ...t, report_config: { ...t.report_config, [field === 'show_results_to_user' ? 'show_results_to_user' : 'pdf_available']: value } }
    }))
    setSaving(null)
  }

  if (loading) return <div className="spinner" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {tests.map(test => (
        <div key={test.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: 'var(--text)', fontSize: '1rem' }}>{test.name}</h3>
              <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{test.slug}</p>
            </div>
            {saving === test.id && (
              <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Guardando...</span>
            )}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Toggle
              label="Test activo (visible en asignaciones)"
              value={test.is_active}
              onChange={v => updateTest(test.id, 'is_active', v)}
            />
            <Toggle
              label="Mostrar resultados al usuario por defecto"
              hint="Puede sobreescribirse por asignación"
              value={test.report_config?.show_results_to_user ?? false}
              onChange={v => updateTest(test.id, 'show_results_to_user', v)}
            />
            <Toggle
              label="PDF disponible para este test"
              value={test.report_config?.pdf_available ?? false}
              onChange={v => updateTest(test.id, 'pdf_available', v)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: '40px', height: '22px', borderRadius: '99px', flexShrink: 0,
          background: value ? 'var(--accent)' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px',
          left: value ? '21px' : '3px',
          width: '16px', height: '16px',
          borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <div>
        <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{label}</span>
        {hint && <p style={{ fontSize: '0.78rem', marginTop: '0' }}>{hint}</p>}
      </div>
    </label>
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
          <AssignmentCard key={a.id} assignment={a} onUpdate={load} />
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
  const [name, setName]                   = useState('')
  const [notes, setNotes]                 = useState('')
  const [selectedTests, setSelectedTests] = useState([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

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
                    <input type="checkbox" checked={!!selected} onChange={() => toggleTest(test.id)} />
                    {test.name}
                  </label>
                  {selected && (
                    <select
                      value={selected.show_results === null ? 'default' : selected.show_results ? 'yes' : 'no'}
                      onChange={e => setShowResults(test.id, e.target.value === 'default' ? null : e.target.value === 'yes')}
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}
                    >
                      <option value="default">Visibilidad: por defecto del test</option>
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

function AssignmentCard({ assignment, onUpdate }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(assignment.claim_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusLabel = {
    pending:   { label: 'Pendiente',  cls: 'badge--pending' },
    claimed:   { label: 'Reclamado',  cls: 'badge--approved' },
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
              <span key={at.id} style={{
                fontSize: '0.75rem', background: 'var(--accent-dim)',
                color: 'var(--accent)', padding: '0.15rem 0.5rem', borderRadius: '99px',
              }}>
                {at.tests?.name}
              </span>
            ))}
          </div>
        </div>

        {assignment.status === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <div style={{
              fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700,
              letterSpacing: '0.15em', color: 'var(--accent)',
              background: 'var(--accent-dim)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)',
            }}>
              {assignment.claim_code}
            </div>
            <button
              className="btn btn--ghost"
              style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
              onClick={copyCode}
            >
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
      .select('*, profiles:user_id(full_name), test_sessions:session_id(completed_at, tests(name))')
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

      {!loading && requests.map(req => (
        <div key={req.id} className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{req.profiles?.full_name || '—'}</span>
                <span className={`badge badge--${req.status}`}>
                  {req.status === 'pending' && 'Pendiente'}
                  {req.status === 'approved' && 'Aprobada'}
                  {req.status === 'rejected' && 'Rechazada'}
                  {req.status === 'downloaded' && 'Descargada'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                <strong>Test:</strong> {req.test_sessions?.tests?.name || '—'}
              </p>
            </div>
            {req.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn--primary" style={{ fontSize: '0.875rem' }} onClick={() => updateStatus(req.id, 'approved')}>Aprobar</button>
                <button className="btn btn--danger"  style={{ fontSize: '0.875rem' }} onClick={() => updateStatus(req.id, 'rejected')}>Rechazar</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
