import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Test({ session }) {
  const { slug }     = useParams()
  const navigate     = useNavigate()

  const [test, setTest]         = useState(null)
  const [items, setItems]       = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [responses, setResponses] = useState({}) // { item_id: value }
  const [page, setPage]         = useState(0)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function load() {
      // Load test + items
      const { data: testData, error: testErr } = await supabase
        .from('tests')
        .select('*, test_items(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (testErr || !testData) {
        setError('Test no encontrado.')
        setLoading(false)
        return
      }

      const sortedItems = (testData.test_items || []).sort((a, b) => a.item_index - b.item_index)
      setTest(testData)
      setItems(sortedItems)

      // Create a new session
      const { data: sess, error: sessErr } = await supabase
        .from('test_sessions')
        .insert({ user_id: session.user.id, test_id: testData.id })
        .select()
        .single()

      if (sessErr) {
        setError('No se pudo iniciar la sesión. Intenta de nuevo.')
        setLoading(false)
        return
      }

      setSessionId(sess.id)
      setLoading(false)
    }
    load()
  }, [slug, session.user.id])

  const perPage    = test?.display_config?.questions_per_page || 10
  const totalPages = Math.ceil(items.length / perPage)
  const pageItems  = items.slice(page * perPage, (page + 1) * perPage)
  const progress   = Math.round(((page * perPage + Object.keys(responses).length) / items.length) * 100)

  const pageAnswered = pageItems.every(item => responses[item.id] !== undefined)

  function handleResponse(itemId, value) {
    setResponses(prev => ({ ...prev, [itemId]: value }))
  }

  async function handleNext() {
    if (page < totalPages - 1) {
      setPage(p => p + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      await handleSubmit()
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    // Save all responses
    const responseRows = items.map(item => ({
      session_id:     sessionId,
      item_id:        item.id,
      response_value: responses[item.id] ?? 0,
    }))

    const { error: respErr } = await supabase
      .from('test_responses')
      .insert(responseRows)

    if (respErr) {
      setError('Error al guardar respuestas. Intenta de nuevo.')
      setSubmitting(false)
      return
    }

    // Call scoring serverless function
    const res = await fetch('/api/score-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, testId: test.id }),
    })

    if (!res.ok) {
      setError('Error al calcular resultados. Intenta de nuevo.')
      setSubmitting(false)
      return
    }

    navigate(`/results/${sessionId}`)
  }

  if (loading) return <div className="spinner" />
  if (error)   return <div className="page"><div className="container"><p style={{ color: 'var(--danger)' }}>{error}</p></div></div>

  const labels = test.display_config?.response_labels || {}

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            {test.name}
          </p>
          <h2>Página {page + 1} de {totalPages}</h2>

          {/* Progress bar */}
          <div style={{ marginTop: '1rem', height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent)',
              borderRadius: '99px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>{progress}% completado</p>
        </div>

        {/* Response scale legend */}
        {Object.keys(labels).length > 0 && (
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            {Object.entries(labels).map(([val, label]) => (
              <span key={val} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{val}</strong> = {label}
              </span>
            ))}
          </div>
        )}

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {pageItems.map((item, idx) => (
            <QuestionCard
              key={item.id}
              item={item}
              number={page * perPage + idx + 1}
              value={responses[item.id]}
              onChange={val => handleResponse(item.id, val)}
              min={test.scoring_config?.response_min ?? 0}
              max={test.scoring_config?.response_max ?? 4}
              labels={labels}
            />
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
          <button
            className="btn btn--ghost"
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 0}
          >
            ← Anterior
          </button>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

          <button
            className="btn btn--primary"
            onClick={handleNext}
            disabled={!pageAnswered || submitting}
          >
            {submitting ? 'Calculando...' : page < totalPages - 1 ? 'Siguiente →' : 'Ver resultados'}
          </button>
        </div>

      </div>
    </div>
  )
}

function QuestionCard({ item, number, value, onChange, min, max, labels }) {
  const options = []
  for (let i = min; i <= max; i++) options.push(i)

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <p style={{ color: 'var(--text)', marginBottom: '1rem', lineHeight: '1.5' }}>
        <span style={{ fontWeight: 600, marginRight: '0.5rem', color: 'var(--accent)' }}>{number}.</span>
        {item.text}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              border: `2px solid ${value === opt ? 'var(--accent)' : 'var(--border)'}`,
              background: value === opt ? 'var(--accent)' : 'var(--surface)',
              color: value === opt ? '#fff' : 'var(--text)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            title={labels[String(opt)] || ''}
          >
            {opt}
          </button>
        ))}
      </div>
      {labels[String(value)] !== undefined && value !== undefined && (
        <p style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: 'var(--accent)' }}>
          {labels[String(value)]}
        </p>
      )}
    </div>
  )
}
