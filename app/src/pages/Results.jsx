import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const CATEGORY_LABELS = {
  exc_low:  'Excepcionalmente Bajo',
  very_low: 'Muy Bajo',
  low:      'Bajo',
  mod_low:  'Promedio Bajo',
  avg:      'Promedio',
  mod_high: 'Promedio Alto',
  high:     'Alto',
  very_high:'Muy Alto',
  exc_high: 'Excepcionalmente Alto',
}

export default function Results({ session }) {
  const { sessionId } = useParams()
  const [data, setData]         = useState(null)
  const [scales, setScales]     = useState([])
  const [interps, setInterps]   = useState({})
  const [pdfRequest, setPdfRequest] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function load() {
      // Load session + test
      const { data: sess, error: sessErr } = await supabase
        .from('test_sessions')
        .select('*, tests(*)')
        .eq('id', sessionId)
        .single()

      if (sessErr || !sess) { setError('Sesión no encontrada.'); setLoading(false); return }
      if (sess.user_id !== session.user.id) { setError('Acceso denegado.'); setLoading(false); return }

      setData(sess)

      // Load scales for this test
      const { data: scalesData } = await supabase
        .from('scales')
        .select('*')
        .eq('test_id', sess.test_id)
        .order('display_order')

      setScales(scalesData || [])

      // Load interpretations for the categories in this session's scores
      const scores  = sess.scores || {}
      const scaleIds = Object.values(scores).map(s => s.scale_id).filter(Boolean)
      // Alternative: get scale_ids from scalesData
      const allScaleIds = (scalesData || []).map(s => s.id)
      const categories  = [...new Set(Object.values(scores).map(s => s.category))]

      if (allScaleIds.length && categories.length) {
        const { data: interpsData } = await supabase
          .from('interpretations')
          .select('*')
          .in('scale_id', allScaleIds)
          .in('category', categories)

        const map = {}
        ;(interpsData || []).forEach(i => { map[`${i.scale_id}_${i.category}`] = i })
        setInterps(map)
      }

      // Check for existing PDF request
      const { data: pdfData } = await supabase
        .from('pdf_requests')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()

      setPdfRequest(pdfData)
      setLoading(false)
    }
    load()
  }, [sessionId, session.user.id])

  async function requestPdf() {
    setRequesting(true)
    const { data, error } = await supabase
      .from('pdf_requests')
      .insert({ session_id: sessionId, user_id: session.user.id })
      .select()
      .single()
    setRequesting(false)
    if (!error) setPdfRequest(data)
  }

  if (loading) return <div className="spinner" />
  if (error)   return <div className="page"><div className="container"><p style={{ color: 'var(--danger)' }}>{error}</p></div></div>

  const scores  = data.scores || {}
  const domains = scales.filter(s => s.scale_type === 'domain')
  const aspects = scales.filter(s => s.scale_type === 'aspect')
  const reportConfig = data.tests?.report_config || {}

  return (
    <div className="page">
      <div className="container">

        <div style={{ marginBottom: '2.5rem' }}>
          <Link to="/dashboard" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>← Volver</Link>
          <h2 style={{ marginTop: '0.5rem' }}>{data.tests?.name}</h2>
          <p className="mt-1">
            {new Date(data.completed_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Domain scores summary */}
        {domains.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>Resumen por factor</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {domains.map(domain => {
                const score = scores[domain.slug]
                if (!score) return null
                return (
                  <ScoreChip
                    key={domain.id}
                    label={domain.display_name}
                    percentile={score.percentile}
                    category={score.category}
                    color={domain.color}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Aspect scores + interpretations */}
        {domains.map(domain => {
          const domainAspects = aspects.filter(a => a.domain_id === domain.id)
          if (!domainAspects.length) return null

          return (
            <section key={domain.id} style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '4px', height: '1.5rem', borderRadius: '99px', background: domain.color || 'var(--accent)' }} />
                <h3 style={{ color: 'var(--text)' }}>{domain.display_name}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {domainAspects.map(aspect => {
                  const score = scores[aspect.slug]
                  if (!score) return null
                  const interp = interps[`${aspect.id}_${score.category}`]

                  return (
                    <AspectCard
                      key={aspect.id}
                      aspect={aspect}
                      score={score}
                      interp={interp}
                      domainColor={domain.color}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* PDF request */}
        {reportConfig.pdf_available && (
          <div className="card" style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>Informe completo en PDF</h3>
            {!pdfRequest && (
              <>
                <p className="mt-1" style={{ marginBottom: '1.5rem' }}>
                  Solicita tu informe detallado. Un administrador lo aprobará a la brevedad.
                </p>
                <button className="btn btn--primary" onClick={requestPdf} disabled={requesting}>
                  {requesting ? 'Enviando solicitud...' : 'Solicitar informe PDF'}
                </button>
              </>
            )}
            {pdfRequest && (
              <div style={{ marginTop: '0.5rem' }}>
                <span className={`badge badge--${pdfRequest.status}`}>
                  {pdfRequest.status === 'pending'   && 'Solicitud pendiente'}
                  {pdfRequest.status === 'approved'  && 'Aprobado — descarga disponible'}
                  {pdfRequest.status === 'rejected'  && 'Solicitud rechazada'}
                  {pdfRequest.status === 'downloaded' && 'Descargado'}
                </span>
                {pdfRequest.status === 'pending' && (
                  <p className="mt-2" style={{ fontSize: '0.875rem' }}>
                    Un administrador revisará tu solicitud pronto.
                  </p>
                )}
                {pdfRequest.status === 'approved' && (
                  <button className="btn btn--primary mt-3">
                    Descargar PDF
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function ScoreChip({ label, percentile, category, color }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: `4px solid ${color || 'var(--accent)'}` }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          p{percentile}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {CATEGORY_LABELS[category] || category}
        </span>
      </div>
    </div>
  )
}

function AspectCard({ aspect, score, interp, domainColor }) {
  const [expanded, setExpanded] = useState(false)

  function renderInterpretation() {
    if (!interp?.content) return null
    const blocks = interp.content
    return blocks.map((block, i) => {
      if (block.type === 'percentile_inject') {
        const pct   = score.percentile
        const above = pct > 50 ? pct : 100 - pct
        const below = 100 - above
        return (
          <p key={i} style={{ marginTop: '0.75rem' }}>
            Tu puntaje te posiciona en el percentil <strong>{pct}</strong> de {aspect.display_name}.
            Esto significa que, si fueras una de 100 personas en una habitación, tendrías{' '}
            {pct > 50 ? 'mayor' : 'menor'} {aspect.display_name} que <strong>{pct > 50 ? pct : below}</strong> de ellas
            y {pct > 50 ? 'menor' : 'mayor'} {aspect.display_name} que <strong>{pct > 50 ? below : pct}</strong> de ellas.
          </p>
        )
      }
      // Text block — split on \n\n for paragraph breaks
      return block.content.split('\n\n').map((para, j) => (
        <p key={`${i}-${j}`} style={{ marginTop: j > 0 ? '0.75rem' : 0 }}>{para}</p>
      ))
    })
  }

  return (
    <div className="card">
      {/* Aspect header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ color: 'var(--text)' }}>{aspect.display_name}</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {CATEGORY_LABELS[score.category] || score.category}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <PercentileBar value={score.percentile} color={domainColor} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text)', minWidth: '3rem', textAlign: 'right' }}>
            p{score.percentile}
          </span>
        </div>
      </div>

      {/* Interpretation toggle */}
      {interp && (
        <>
          <button
            className="btn btn--ghost"
            style={{ marginTop: '1rem', fontSize: '0.85rem', padding: '0.35rem 0', color: 'var(--accent)' }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Ocultar interpretación ↑' : 'Ver interpretación ↓'}
          </button>
          {expanded && (
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', lineHeight: '1.7', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {renderInterpretation()}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PercentileBar({ value, color }) {
  return (
    <div style={{ width: '120px' }}>
      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: color || 'var(--accent)',
          borderRadius: '99px',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}
