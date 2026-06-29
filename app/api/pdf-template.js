// api/pdf-template.js
const React = require('react')
const {
  Document, Page, Text, View, StyleSheet
} = require('@react-pdf/renderer')

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

const C = {
  accent: '#2A7F6F',
  text:   '#1C1C1E',
  muted:  '#6B6B6E',
  border: '#E2E0DA',
  bg:     '#F7F6F3',
  white:  '#FFFFFF',
}

const DOMAIN_COLORS = {
  agreeableness:     '#4F86C6',
  conscientiousness: '#F4A261',
  extraversion:      '#2A9D8F',
  neuroticism:       '#E76F51',
  openness_to_exp:   '#8338EC',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56, paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 10, lineHeight: 1.6,
    color: C.text, backgroundColor: C.white,
  },
  coverPage: {
    paddingTop: 80, paddingBottom: 56,
    paddingHorizontal: 56,
    backgroundColor: C.white,
  },
  accentBar: {
    width: 48, height: 4,
    backgroundColor: C.accent,
    borderRadius: 2, marginBottom: 28,
  },
  coverTitle: {
    fontSize: 26, fontFamily: 'Helvetica-Bold',
    color: C.text, marginBottom: 6, lineHeight: 1.25,
  },
  coverSubtitle: {
    fontSize: 13, color: C.muted, marginBottom: 48,
  },
  coverLabel: {
    fontSize: 9, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 3,
  },
  coverValue: {
    fontSize: 12, fontFamily: 'Helvetica-Bold',
    color: C.text, marginBottom: 20,
  },
  coverFooter: {
    position: 'absolute', bottom: 40,
    left: 56, right: 56,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 14, fontSize: 8.5, color: C.muted,
  },
  sectionLabel: {
    fontSize: 9, fontFamily: 'Helvetica-Bold',
    color: C.accent, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 12,
  },
  bodyText: {
    fontSize: 10, lineHeight: 1.75,
    color: C.text, marginBottom: 8,
  },
  domainHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 6,
  },
  domainBar: {
    width: 3, height: 18,
    borderRadius: 2, marginRight: 10,
  },
  domainName: {
    fontSize: 14, fontFamily: 'Helvetica-Bold',
    color: C.text, textTransform: 'uppercase',
  },
  domainCategory: {
    fontSize: 10, color: C.muted, marginLeft: 8,
  },
  pctRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, marginTop: 2,
  },
  pctBox: {
    backgroundColor: C.bg, borderRadius: 4,
    paddingVertical: 3, paddingHorizontal: 9,
    marginRight: 10,
  },
  pctNum: {
    fontSize: 15, fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  barTrack: {
    flex: 1, height: 5,
    backgroundColor: C.border, borderRadius: 3,
  },
  barFill: {
    height: 5, borderRadius: 3,
  },
  aspectWrap: {
    marginLeft: 13, marginBottom: 20,
    paddingLeft: 12,
    borderLeftWidth: 2, borderLeftColor: C.border,
  },
  aspectName: {
    fontSize: 11, fontFamily: 'Helvetica-Bold',
    color: C.text, marginBottom: 2,
  },
  aspectCat: {
    fontSize: 9, color: C.muted, marginBottom: 5,
  },
  aspectPctRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 7,
  },
  aspectPctNum: {
    fontSize: 11, fontFamily: 'Helvetica-Bold',
    color: C.accent, marginRight: 8,
  },
  aspectBar: {
    flex: 1, height: 4,
    backgroundColor: C.border, borderRadius: 2,
  },
  aspectBarFill: {
    height: 4, borderRadius: 2,
  },
  pageNum: {
    position: 'absolute', bottom: 30,
    left: 0, right: 0,
    textAlign: 'center', fontSize: 9, color: C.muted,
  },
  domainSection: { marginBottom: 20 },
})

const INTRO = [
  'Has terminado de evaluarte a ti mismo con 100 frases. El sistema compara tu puntaje con el de miles de otras personas. Se te compara con hombres y mujeres de todas las edades.',
  'Esto significa que, si eres joven, tus puntajes en Neuroticismo serán más altos y los de Amabilidad y Responsabilidad serán más bajos de lo que serían si se te comparara con gente de tu propia edad. Para los hombres, las puntuaciones en Amabilidad y Neuroticismo serán más bajas que si solo se compararan con otros hombres. La idea es mantener las comparaciones simples, de tal forma que puedas saber en qué posición estás en comparación con una persona promedio, sin hacer caso de factores como edad o sexo.',
  'A continuación, se te presentarán tus resultados en los 5 grandes rasgos de la personalidad y en los 2 aspectos que tiene cada uno de los rasgos. Estos rasgos y aspectos son:\n\nAmabilidad: Compasión y Cortesía\nResponsabilidad: Laboriosidad y Orden\nExtraversión: Entusiasmo y Asertividad\nNeuroticismo: Emoción Negativa e Irritabilidad\nApertura a la Experiencia: Intelecto y Apertura',
  'Recuerda que cada rasgo y aspecto de la personalidad tiene ventajas y desventajas. Es por esa razón que existe variación en la población: hay un nicho para cada una de las distintas configuraciones de personalidad. Gran parte de lo que constituye el éxito en la vida es la consecuencia de encontrar el lugar adecuado en las relaciones, el trabajo y el compromiso personal, que se corresponda con tu estructura única de personalidad.',
  'Ten en cuenta también que si encuentras que las descripciones son más duras de lo que podría parecer apropiado, puede significar que fuiste más autocrítico de lo necesario al completar las preguntas. Recuerda, los resultados se basan en tu propio auto-reporte, en comparación con el de otros.',
]

function pctSentence(pct, name) {
  const hi = pct > 50 ? pct : 100 - pct
  const lo = 100 - hi
  return `Tu puntaje te posiciona en el percentil ${pct} de ${name}. Esto significa que, si fueras una de 100 personas en una habitación, tendrías ${pct > 50 ? 'mayor' : 'menor'} ${name} que ${pct > 50 ? pct : lo} de ellas y ${pct > 50 ? 'menor' : 'mayor'} ${name} que ${pct > 50 ? lo : pct} de ellas.`
}

function renderBlocks(blocks, name, pct) {
  if (!blocks) return null
  return blocks.map((b, i) => {
    if (b.type === 'percentile_inject') {
      return React.createElement(Text, { key: i, style: styles.bodyText }, pctSentence(pct, name))
    }
    return b.content.split('\n\n').map((para, j) =>
      React.createElement(Text, { key: `${i}-${j}`, style: styles.bodyText }, para)
    )
  })
}

function PageNum() {
  return React.createElement(
    Text,
    {
      style: styles.pageNum,
      render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`,
      fixed: true,
    }
  )
}

function BfasReport({ profile, session, scales, interps }) {
  const scores  = session.scores || {}
  const domains = scales.filter(s => s.scale_type === 'domain')
  const aspects = scales.filter(s => s.scale_type === 'aspect')

  const dateStr = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('es-PE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  // Cover page
  const cover = React.createElement(
    Page, { key: 'cover', size: 'A4', style: styles.coverPage },
    React.createElement(View, { style: styles.accentBar }),
    React.createElement(Text, { style: styles.coverTitle }, 'Informe de\nPersonalidad'),
    React.createElement(Text, { style: styles.coverSubtitle }, 'Big Five Aspect Scales (BFAS)'),
    React.createElement(Text, { style: styles.coverLabel }, 'Nombre'),
    React.createElement(Text, { style: styles.coverValue }, profile.full_name || '—'),
    React.createElement(Text, { style: styles.coverLabel }, 'Fecha de evaluación'),
    React.createElement(Text, { style: styles.coverValue }, dateStr),
    profile.birth_date
      ? React.createElement(React.Fragment, { key: 'bd' },
          React.createElement(Text, { style: styles.coverLabel }, 'Fecha de nacimiento'),
          React.createElement(Text, { style: styles.coverValue }, profile.birth_date)
        )
      : null,
    React.createElement(
      View, { style: styles.coverFooter },
      React.createElement(Text, null,
        'Este informe es confidencial y ha sido generado de forma automatizada a partir de las respuestas proporcionadas por el evaluado.'
      )
    )
  )

  // Intro page
  const intro = React.createElement(
    Page, { key: 'intro', size: 'A4', style: styles.page },
    React.createElement(Text, { style: styles.sectionLabel }, 'Introducción'),
    ...INTRO.map((p, i) => React.createElement(Text, { key: i, style: styles.bodyText }, p)),
    React.createElement(PageNum)
  )

  // Domain pages
  const domainPages = domains.map(domain => {
    const ds     = scores[domain.slug]
    const di     = ds?.category ? interps[`${domain.id}_${ds.category}`] : null
    const color  = DOMAIN_COLORS[domain.slug] || C.accent
    const das    = aspects.filter(a => a.domain_id === domain.id)

    const aspectViews = das.map(aspect => {
      const as = scores[aspect.slug]
      if (!as) return null
      const ai = interps[`${aspect.id}_${as.category}`]

      return React.createElement(
        View, { key: aspect.id, style: styles.aspectWrap, wrap: false },
        React.createElement(Text, { style: styles.aspectName }, aspect.display_name),
        as.category
          ? React.createElement(Text, { style: styles.aspectCat },
              CATEGORY_LABELS[as.category] || as.category)
          : null,
        as.percentile != null
          ? React.createElement(
              View, { style: styles.aspectPctRow },
              React.createElement(Text, { style: styles.aspectPctNum }, `p${as.percentile}`),
              React.createElement(
                View, { style: styles.aspectBar },
                React.createElement(View, {
                  style: [styles.aspectBarFill, { width: `${as.percentile}%`, backgroundColor: color }]
                })
              )
            )
          : null,
        ...( ai?.content ? renderBlocks(ai.content, aspect.display_name, as.percentile) : [] )
      )
    }).filter(Boolean)

    return React.createElement(
      Page, { key: domain.id, size: 'A4', style: styles.page },

      // Domain header
      React.createElement(
        View, { style: styles.domainSection },
        React.createElement(
          View, { style: styles.domainHeaderRow },
          React.createElement(View, { style: [styles.domainBar, { backgroundColor: color }] }),
          React.createElement(Text, { style: styles.domainName }, domain.display_name),
          ds?.category
            ? React.createElement(Text, { style: styles.domainCategory },
                CATEGORY_LABELS[ds.category] || ds.category)
            : null
        ),
        ds?.percentile != null
          ? React.createElement(
              View, { style: styles.pctRow },
              React.createElement(
                View, { style: styles.pctBox },
                React.createElement(Text, { style: styles.pctNum }, `p${ds.percentile}`)
              ),
              React.createElement(
                View, { style: styles.barTrack },
                React.createElement(View, {
                  style: [styles.barFill, { width: `${ds.percentile}%`, backgroundColor: color }]
                })
              )
            )
          : null,
        ...( di?.content ? renderBlocks(di.content, domain.display_name, ds?.percentile) : [] )
      ),

      // Aspects
      ...aspectViews,
      React.createElement(PageNum)
    )
  })

  return React.createElement(
    Document,
    {
      title: `Informe BFAS — ${profile.full_name}`,
      author: 'Psych Tests',
    },
    cover,
    intro,
    ...domainPages
  )
}

module.exports = { BfasReport, CATEGORY_LABELS }
