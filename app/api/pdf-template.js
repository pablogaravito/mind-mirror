// api/pdf-template.js
// React PDF document template for BFAS report.
// Uses @react-pdf/renderer — no browser/DOM needed, runs in Node serverless.

import {
  Document, Page, Text, View, StyleSheet, Font
} from '@react-pdf/renderer'

// ── Category labels ──────────────────────────────────────────
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

// ── Styles ───────────────────────────────────────────────────
const C = {
  accent:    '#2A7F6F',
  text:      '#1C1C1E',
  muted:     '#6B6B6E',
  border:    '#E2E0DA',
  bg:        '#F7F6F3',
  white:     '#FFFFFF',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: 'Helvetica',
    color: C.text,
    fontSize: 10,
    lineHeight: 1.6,
    backgroundColor: C.white,
  },

  // ── Cover ──
  coverPage: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    backgroundColor: C.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  coverAccentBar: {
    width: 48,
    height: 4,
    backgroundColor: C.accent,
    borderRadius: 2,
    marginBottom: 32,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 11,
    color: C.text,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    left: 56,
    right: 56,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
    fontSize: 9,
    color: C.muted,
  },

  // ── Logo placeholder (for future use) ──
  logoPlaceholder: {
    width: 120,
    height: 32,
    marginBottom: 48,
  },

  // ── Intro ──
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.7,
    color: C.text,
    marginBottom: 8,
  },

  // ── Domain section ──
  domainContainer: {
    marginBottom: 24,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  domainAccent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  domainTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    textTransform: 'uppercase',
  },
  domainCategory: {
    fontSize: 10,
    color: C.muted,
    marginLeft: 8,
  },
  percentileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  percentileBox: {
    backgroundColor: C.bg,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  percentileNumber: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  percentileBar: {
    flex: 1,
    height: 5,
    backgroundColor: C.border,
    borderRadius: 3,
  },
  percentileBarFill: {
    height: 5,
    backgroundColor: C.accent,
    borderRadius: 3,
  },

  // ── Aspect ──
  aspectContainer: {
    marginLeft: 13,
    marginBottom: 18,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
  },
  aspectTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 4,
  },
  aspectCategory: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 6,
  },
  aspectPercentileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aspectPercentileNum: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    marginRight: 8,
  },
  aspectBar: {
    flex: 1,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
  },
  aspectBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // ── Page number ──
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: C.muted,
  },
})

// ── Helpers ──────────────────────────────────────────────────

function percentileSentence(pct, name) {
  const above = pct > 50 ? pct : 100 - pct
  const below = 100 - above
  return `Tu puntaje te posiciona en el percentil ${pct} de ${name}. Esto significa que, si fueras una de 100 personas en una habitación, tendrías ${pct > 50 ? 'mayor' : 'menor'} ${name} que ${pct > 50 ? pct : below} de ellas y ${pct > 50 ? 'menor' : 'mayor'} ${name} que ${pct > 50 ? below : pct} de ellas.`
}

function renderBlocks(blocks, scaleName, pct) {
  if (!blocks?.length) return null
  return blocks.map((block, i) => {
    if (block.type === 'percentile_inject') {
      return (
        <Text key={i} style={styles.bodyText}>
          {percentileSentence(pct, scaleName)}
        </Text>
      )
    }
    return block.content.split('\n\n').map((para, j) => (
      <Text key={`${i}-${j}`} style={styles.bodyText}>{para}</Text>
    ))
  })
}

// ── INTRO TEXT ────────────────────────────────────────────────
const INTRO_PARAGRAPHS = [
  'Has terminado de evaluarte a ti mismo con 100 frases. El sistema compara tu puntaje con el de miles de otras personas. Se te compara con hombres y mujeres de todas las edades.',
  'Esto significa que, si eres joven, tus puntajes en Neuroticismo serán más altos y los de Amabilidad y Responsabilidad serán más bajos de lo que serían si se te comparara con gente de tu propia edad (y será lo contrario para personas más mayores). Para los hombres, las puntuaciones en Amabilidad y Neuroticismo serán más bajas que si solo se compararan con otros hombres. La idea es mantener las comparaciones simples, de tal forma que puedas saber en qué posición estás en comparación con una persona promedio (sin hacer caso de factores como edad o sexo).',
  'A continuación, se te presentarán tus resultados en los 5 grandes rasgos de la personalidad y en los 2 aspectos que tiene cada uno de los rasgos. Estos rasgos y aspectos son:\n\nAmabilidad: Compasión y Cortesía\nResponsabilidad: Laboriosidad y Orden\nExtraversión: Entusiasmo y Asertividad\nNeuroticismo: Emoción Negativa e Irritabilidad\nApertura a la Experiencia: Intelecto y Apertura',
  'Recuerda que cada rasgo y aspecto de la personalidad (y su posición relativa con respecto a ellos) tiene ventajas y desventajas. Es por esa razón que existe variación en la población: hay un nicho para cada una de las distintas configuraciones de personalidad. Gran parte de lo que constituye el éxito en la vida es, por lo tanto, la consecuencia de encontrar el lugar adecuado en las relaciones, el trabajo y el compromiso personal, que se corresponda con tu estructura única de personalidad.',
  'Ten en cuenta también que si encuentras que las descripciones son más duras de lo que podría parecer apropiado, puede significar que fuiste más autocrítico de lo necesario al completar las preguntas (recuerda, los resultados se basan en tu propio auto-reporte, en comparación con el de otros). Esto puede ocurrir si te sentías temporalmente o crónicamente infeliz o ansioso, hambriento, enojado o demasiado crítico cuando completaste las preguntas.',
]

// ── DOMAIN COLORS ─────────────────────────────────────────────
const DOMAIN_COLORS = {
  agreeableness:     '#4F86C6',
  conscientiousness: '#F4A261',
  extraversion:      '#2A9D8F',
  neuroticism:       '#E76F51',
  openness_to_exp:   '#8338EC',
}

// ── MAIN DOCUMENT ─────────────────────────────────────────────
export default function BfasReport({ profile, session, scales, interps }) {
  const scores  = session.scores || {}
  const domains = scales.filter(s => s.scale_type === 'domain')
  const aspects = scales.filter(s => s.scale_type === 'aspect')

  const completedDate = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('es-PE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <Document
      title={`Informe BFAS — ${profile.full_name}`}
      author="Psych Tests"
      subject="Big Five Aspect Scales"
    >
      {/* ── COVER PAGE ── */}
      <Page size="A4" style={styles.coverPage}>
        {/* Logo placeholder — swap with <Image> when you have a logo file */}
        <View style={styles.logoPlaceholder} />

        <View style={styles.coverAccentBar} />
        <Text style={styles.coverTitle}>Informe de{'\n'}Personalidad</Text>
        <Text style={styles.coverSubtitle}>Big Five Aspect Scales (BFAS)</Text>

        <Text style={styles.coverMeta}>Nombre</Text>
        <Text style={styles.coverMetaValue}>{profile.full_name}</Text>

        <Text style={styles.coverMeta}>Fecha de evaluación</Text>
        <Text style={styles.coverMetaValue}>{completedDate}</Text>

        {profile.birth_date && (
          <>
            <Text style={styles.coverMeta}>Fecha de nacimiento</Text>
            <Text style={styles.coverMetaValue}>{profile.birth_date}</Text>
          </>
        )}

        <View style={styles.coverFooter}>
          <Text>Este informe es confidencial y ha sido generado de forma automatizada a partir de las respuestas proporcionadas por el evaluado.</Text>
        </View>
      </Page>

      {/* ── INTRO PAGE ── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Introducción</Text>
        {INTRO_PARAGRAPHS.map((para, i) => (
          <Text key={i} style={styles.bodyText}>{para}</Text>
        ))}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        } fixed />
      </Page>

      {/* ── DOMAIN PAGES ── */}
      {domains.map((domain) => {
        const domainScore  = scores[domain.slug]
        const domainInterp = domainScore?.category
          ? interps[`${domain.id}_${domainScore.category}`]
          : null
        const domainAspects = aspects.filter(a => a.domain_id === domain.id)
        const color = DOMAIN_COLORS[domain.slug] || C.accent

        return (
          <Page key={domain.id} size="A4" style={styles.page}>

            {/* Domain header */}
            <View style={styles.domainContainer}>
              <View style={styles.domainHeader}>
                <View style={[styles.domainAccent, { backgroundColor: color }]} />
                <Text style={styles.domainTitle}>{domain.display_name}</Text>
                {domainScore?.category && (
                  <Text style={styles.domainCategory}>
                    {CATEGORY_LABELS[domainScore.category]}
                  </Text>
                )}
              </View>

              {/* Percentile bar */}
              {domainScore?.percentile != null && (
                <View style={styles.percentileRow}>
                  <View style={styles.percentileBox}>
                    <Text style={styles.percentileNumber}>
                      p{domainScore.percentile}
                    </Text>
                  </View>
                  <View style={styles.percentileBar}>
                    <View style={[
                      styles.percentileBarFill,
                      { width: `${domainScore.percentile}%`, backgroundColor: color }
                    ]} />
                  </View>
                </View>
              )}

              {/* Domain interpretation */}
              {domainInterp?.content && renderBlocks(
                domainInterp.content,
                domain.display_name,
                domainScore?.percentile
              )}
            </View>

            {/* Aspects */}
            {domainAspects.map((aspect) => {
              const score  = scores[aspect.slug]
              if (!score) return null
              const interp = interps[`${aspect.id}_${score.category}`]

              return (
                <View key={aspect.id} style={styles.aspectContainer} wrap={false}>
                  <Text style={styles.aspectTitle}>{aspect.display_name}</Text>
                  {score.category && (
                    <Text style={styles.aspectCategory}>
                      {CATEGORY_LABELS[score.category]}
                    </Text>
                  )}

                  {score.percentile != null && (
                    <View style={styles.aspectPercentileRow}>
                      <Text style={styles.aspectPercentileNum}>p{score.percentile}</Text>
                      <View style={styles.aspectBar}>
                        <View style={[
                          styles.aspectBarFill,
                          { width: `${score.percentile}%`, backgroundColor: color }
                        ]} />
                      </View>
                    </View>
                  )}

                  {interp?.content && renderBlocks(
                    interp.content,
                    aspect.display_name,
                    score.percentile
                  )}
                </View>
              )
            })}

            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            } fixed />
          </Page>
        )
      })}
    </Document>
  )
}
