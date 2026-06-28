// src/components/ScoreView.jsx
// Reusable score + interpretation display.
// Used by both the user-facing Results page and the admin session view.

import { useState } from 'react'

export const CATEGORY_LABELS = {
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

// ─────────────────────────────────────────────────────────────
// Main export — renders the full score breakdown for a session.
// Props:
//   scores      — the session.scores JSONB object
//   scales      — array of scale rows from DB
//   interps     — map of { "scale_id_category": interpretation row }
// ─────────────────────────────────────────────────────────────
export default function ScoreView({ scores, scales, interps }) {
  if (!scores || !scales?.length) {
    return <p className="text-muted">No hay resultados disponibles.</p>
  }

  const domains = scales.filter(s => s.scale_type === 'domain')
  const aspects = scales.filter(s => s.scale_type === 'aspect')
  const totals  = scales.filter(s => s.scale_type === 'total')

  return (
    <div>
      {/* Domain summary chips */}
      {domains.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>Resumen por factor</h3>
          <div style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          }}>
            {domains.map(domain => {
              const score = scores[domain.slug]
              if (!score) return null
              return (
                <ScoreChip
                  key={domain.id}
                  label={domain.display_name}
                  score={score}
                  color={domain.color}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Total score (for simple tests like PHQ-9) */}
      {totals.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          {totals.map(scale => {
            const score = scores[scale.slug]
            if (!score) return null
            return (
              <ScoreChip
                key={scale.id}
                label={scale.display_name}
                score={score}
                color={scale.color}
              />
            )
          })}
        </section>
      )}

      {/* Aspect scores grouped by domain — domain header includes its own interpretation */}
      {domains.map(domain => {
        const domainAspects = aspects.filter(a => a.domain_id === domain.id)
        const domainScore   = scores[domain.slug]
        const domainInterp  = domainScore?.category
          ? interps?.[`${domain.id}_${domainScore.category}`]
          : null

        return (
          <section key={domain.id} style={{ marginBottom: '3rem' }}>
            <DomainHeader domain={domain} score={domainScore} interp={domainInterp} />
            {domainAspects.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {domainAspects.map(aspect => {
                  const score  = scores[aspect.slug]
                  if (!score) return null
                  const interp = interps?.[`${aspect.id}_${score.category}`]
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
            )}
          </section>
        )
      })}

      {/* Standalone aspects (no domain grouping) */}
      {domains.length === 0 && aspects.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {aspects.map(aspect => {
            const score  = scores[aspect.slug]
            if (!score) return null
            const interp = interps?.[`${aspect.id}_${score.category}`]
            return (
              <AspectCard
                key={aspect.id}
                aspect={aspect}
                score={score}
                interp={interp}
                domainColor={null}
              />
            )
          })}
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Domain header — color bar + name + score + interpretation toggle
// ─────────────────────────────────────────────────────────────
function DomainHeader({ domain, score, interp }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '4px', height: '1.5rem', borderRadius: '99px',
          background: domain.color || 'var(--accent)', flexShrink: 0,
        }} />
        <h3 style={{ color: 'var(--text)' }}>{domain.display_name}</h3>
        {score && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {score.percentile != null && `p${score.percentile} · `}
            {CATEGORY_LABELS[score.category] || score.category}
          </span>
        )}
        {interp?.content && (
          <button
            className="btn btn--ghost"
            style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', color: 'var(--accent)', marginLeft: 'auto' }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Ocultar ↑' : 'Ver interpretación ↓'}
          </button>
        )}
      </div>
      {expanded && interp?.content && (
        <div style={{
          marginTop: '0.75rem', padding: '1rem 1.25rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${domain.color || 'var(--accent)'}`,
          borderRadius: 'var(--radius)',
          fontSize: '0.9rem', lineHeight: '1.7',
        }}>
          <InterpretationText blocks={interp.content} scale={domain} score={score} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Score chip — compact summary card for domains / totals
// ─────────────────────────────────────────────────────────────
function ScoreChip({ label, score, color }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: `4px solid ${color || 'var(--accent)'}` }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
        {score.percentile != null && (
          <span style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            p{score.percentile}
          </span>
        )}
        {score.raw != null && score.percentile == null && (
          <span style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            {score.raw}
          </span>
        )}
        {score.category && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {CATEGORY_LABELS[score.category] || score.category}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Aspect card — score bar + collapsible interpretation
// ─────────────────────────────────────────────────────────────
export function AspectCard({ aspect, score, interp, domainColor }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card">
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <h3 style={{ color: 'var(--text)', fontSize: '1rem' }}>{aspect.display_name}</h3>
          {score.category && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {CATEGORY_LABELS[score.category] || score.category}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {score.percentile != null && (
            <>
              <PercentileBar value={score.percentile} color={domainColor} />
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '1.4rem',
                color: 'var(--text)', minWidth: '3rem', textAlign: 'right',
              }}>
                p{score.percentile}
              </span>
            </>
          )}
          {score.raw != null && score.percentile == null && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text)' }}>
              {score.raw}
            </span>
          )}
        </div>
      </div>

      {/* Interpretation toggle */}
      {interp?.content && (
        <>
          <button
            className="btn btn--ghost"
            style={{ marginTop: '0.75rem', fontSize: '0.85rem', padding: '0.35rem 0', color: 'var(--accent)' }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Ocultar interpretación ↑' : 'Ver interpretación ↓'}
          </button>
          {expanded && (
            <div style={{
              marginTop: '1rem', fontSize: '0.9rem', lineHeight: '1.7',
              borderTop: '1px solid var(--border)', paddingTop: '1rem',
            }}>
              <InterpretationText blocks={interp.content} aspect={aspect} score={score} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Renders JSONB content blocks, injecting percentile sentence
// ─────────────────────────────────────────────────────────────
export function InterpretationText({ blocks, scale, aspect, score }) {
  const scaleName = (scale || aspect)?.display_name
  return blocks.map((block, i) => {
    if (block.type === 'percentile_inject') {
      const pct   = score.percentile
      if (pct == null) return null
      const above = pct > 50 ? pct : 100 - pct
      const below = 100 - above
      return (
        <p key={i} style={{ marginTop: '0.75rem' }}>
          Tu puntaje te posiciona en el percentil <strong>{pct}</strong> de {scaleName}.
          Esto significa que, si fueras una de 100 personas en una habitación, tendrías{' '}
          {pct > 50 ? 'mayor' : 'menor'} {scaleName} que{' '}
          <strong>{pct > 50 ? pct : below}</strong> de ellas y{' '}
          {pct > 50 ? 'menor' : 'mayor'} {scaleName} que{' '}
          <strong>{pct > 50 ? below : pct}</strong> de ellas.
        </p>
      )
    }
    return block.content.split('\n\n').map((para, j) => (
      <p key={`${i}-${j}`} style={{ marginTop: j > 0 ? '0.75rem' : 0 }}>{para}</p>
    ))
  })
}

// ─────────────────────────────────────────────────────────────
// Percentile bar
// ─────────────────────────────────────────────────────────────
export function PercentileBar({ value, color }) {
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
