// api/pdf-template.js
// Pure ESM, no JSX — uses React.createElement directly
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

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

const s = StyleSheet.create({
  page: {
    paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56,
    fontSize: 10, lineHeight: 1.6, color: C.text, backgroundColor: C.white,
  },
  coverPage: {
    paddingTop: 80, paddingBottom: 56, paddingHorizontal: 56,
    backgroundColor: C.white,
  },
  accentBar: { width: 48, height: 4, backgroundColor: C.accent, borderRadius: 2, marginBottom: 28 },
  coverTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 6, lineHeight: 1.25 },
  coverSubtitle: { fontSize: 13, color: C.muted, marginBottom: 48 },
  coverLabel: { fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  coverValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 20 },
  coverFooter: {
    position: 'absolute', bottom: 40, left: 56, right: 56,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 14, fontSize: 8.5, color: C.muted,
  },
  sectionLabel: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.accent,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  body: { fontSize: 10, lineHeight: 1.75, color: C.text, marginBottom: 8 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  // Intro trait list
  traitRow: { marginBottom: 4, flexDirection: 'row' },
  traitName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text },
  traitFacets: { fontSize: 10, fontFamily: 'Helvetica-Oblique', color: C.muted },
  // Domain
  domainHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  domainBar: { width: 3, height: 18, borderRadius: 2, marginRight: 10 },
  domainName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.text, textTransform: 'uppercase' },
  domainCat: { fontSize: 10, color: C.muted, marginLeft: 8 },
  pctRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 2 },
  pctBox: { backgroundColor: C.bg, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 9, marginRight: 10 },
  pctNum: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.accent },
  barTrack: { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 3 },
  barFill: { height: 5, borderRadius: 3 },
  domainSection: { marginBottom: 20 },
  aspectWrap: { marginBottom: 14, paddingTop: 14 },
  aspectName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 2 },
  aspectCat: { fontSize: 9, color: C.muted, marginBottom: 5 },
  aspectPctRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  aspectPctNum: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.accent, marginRight: 8 },
  aspectBar: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2 },
  aspectBarFill: { height: 4, borderRadius: 2 },
  pageNum: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: C.muted },
})

// Intro paragraphs — plain text
const INTRO_PARAS = [
  'Has terminado de evaluarte a ti mismo con 100 frases. El sistema compara tu puntaje con el de miles de otras personas. Se te compara con hombres y mujeres de todas las edades.',
  'Esto significa que, si eres joven, tus puntajes en Neuroticismo serán más altos y los de Amabilidad y Responsabilidad serán más bajos de lo que serían si se te comparara con gente de tu propia edad. Para los hombres, las puntuaciones en Amabilidad y Neuroticismo serán más bajas que si solo se compararan con otros hombres. La idea es mantener las comparaciones simples, de tal forma que puedas saber en qué posición estás en comparación con una persona promedio.',
  'A continuación, se te presentarán tus resultados en los 5 grandes rasgos de la personalidad y en los 2 aspectos que tiene cada uno de los rasgos. Estos rasgos y aspectos son:',
  'Recuerda que cada rasgo y aspecto de la personalidad tiene ventajas y desventajas. Es por esa razón que existe variación en la población: hay un nicho para cada una de las distintas configuraciones de personalidad. Gran parte de lo que constituye el éxito en la vida es la consecuencia de encontrar el lugar adecuado en las relaciones, el trabajo y el compromiso personal, que se corresponda con tu estructura única de personalidad.',
  'Ten en cuenta también que si encuentras que las descripciones son más duras de lo que podría parecer apropiado, puede significar que fuiste más autocrítico de lo necesario al completar las preguntas. Recuerda, los resultados se basan en tu propio auto-reporte, en comparación con el de otros.',
]

// Trait list with bold domain + italic facets
const TRAIT_LIST = [
  { domain: 'Amabilidad',                facets: 'Compasión y Cortesía' },
  { domain: 'Responsabilidad',           facets: 'Laboriosidad y Orden' },
  { domain: 'Extraversión',              facets: 'Entusiasmo y Asertividad' },
  { domain: 'Neuroticismo',              facets: 'Emoción Negativa e Irritabilidad' },
  { domain: 'Apertura a la Experiencia', facets: 'Intelecto y Apertura' },
]

const e = React.createElement

function pctSentence(pct, name) {
  const hi = pct > 50 ? pct : 100 - pct
  const lo = 100 - hi
  return `Tu puntaje te posiciona en el percentil ${pct} de ${name}. Esto significa que, si fueras una de 100 personas en una habitación, tendrías ${pct > 50 ? 'mayor' : 'menor'} ${name} que ${pct > 50 ? pct : lo} de ellas y ${pct > 50 ? 'menor' : 'mayor'} ${name} que ${pct > 50 ? lo : pct} de ellas.`
}

function renderBlocks(blocks, name, pct) {
  if (!blocks) return []
  return blocks.flatMap((b, i) => {
    if (b.type === 'percentile_inject') {
      return [e(Text, { key: `pct-${i}`, style: s.body }, pctSentence(pct, name))]
    }
    return b.content.split('\n\n').map((para, j) =>
      e(Text, { key: `${i}-${j}`, style: s.body }, para)
    )
  })
}

function PageNum() {
  return e(Text, {
    style: s.pageNum,
    render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`,
    fixed: true,
  })
}

export function BfasReport({ profile, session, scales, interps }) {
  const scores  = session.scores || {}
  const domains = scales.filter(sc => sc.scale_type === 'domain')
  const aspects = scales.filter(sc => sc.scale_type === 'aspect')

  const dateStr = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('es-PE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  // ── Cover ─────────────────────────────────────────────────
  const cover = e(Page, { key: 'cover', size: 'A4', style: s.coverPage },
    e(View, { style: s.accentBar }),
    e(Text, { style: s.coverTitle }, 'Informe de\nPersonalidad'),
    e(Text, { style: s.coverSubtitle }, 'Big Five Aspect Scales (BFAS)'),
    e(Text, { style: s.coverLabel }, 'Nombre'),
    e(Text, { style: s.coverValue }, profile.full_name || '—'),
    e(Text, { style: s.coverLabel }, 'Fecha de evaluación'),
    e(Text, { style: s.coverValue }, dateStr),
    profile.birth_date
      ? e(React.Fragment, { key: 'bd' },
          e(Text, { style: s.coverLabel }, 'Fecha de nacimiento'),
          e(Text, { style: s.coverValue }, profile.birth_date)
        )
      : null,
    e(View, { style: s.coverFooter },
      e(Text, null,
        'Este informe es confidencial y ha sido generado de forma automatizada a partir de las respuestas proporcionadas por el evaluado.'
      )
    )
  )

  // ── Intro ──────────────────────────────────────────────────
  const intro = e(Page, { key: 'intro', size: 'A4', style: s.page },
    e(Text, { style: s.sectionLabel }, 'Introducción'),
    // Para 1
    e(Text, { key: 'p0', style: s.body }, INTRO_PARAS[0]),
    // Para 2
    e(Text, { key: 'p1', style: s.body }, INTRO_PARAS[1]),
    // Para 3 + trait list
    e(Text, { key: 'p2', style: s.body }, INTRO_PARAS[2]),
    e(View, { key: 'traits', style: { marginBottom: 10, marginLeft: 12 } },
      ...TRAIT_LIST.map((t, i) =>
        e(View, { key: i, style: s.traitRow },
          e(Text, { style: s.traitName }, `${t.domain}: `),
          e(Text, { style: s.traitFacets }, t.facets)
        )
      )
    ),
    // Para 4 + 5
    e(Text, { key: 'p3', style: s.body }, INTRO_PARAS[3]),
    e(Text, { key: 'p4', style: s.body }, INTRO_PARAS[4]),
    e(PageNum)
  )

  // ── Domain pages ───────────────────────────────────────────
  const domainPages = domains.map(domain => {
    const ds    = scores[domain.slug]
    const di    = ds?.category ? interps[`${domain.id}_${ds.category}`] : null
    const color = DOMAIN_COLORS[domain.slug] || C.accent
    const das   = aspects.filter(a => a.domain_id === domain.id)

    const aspectViews = das.map(aspect => {
      const as = scores[aspect.slug]
      if (!as) return null
      const ai = interps[`${aspect.id}_${as.category}`]
      return e(View, { key: aspect.id, style: s.aspectWrap },
        e(Text, { style: s.aspectName }, aspect.display_name),
        as.category
          ? e(Text, { style: s.aspectCat }, CATEGORY_LABELS[as.category] || as.category)
          : null,
        as.percentile != null
          ? e(View, { style: s.aspectPctRow },
              e(Text, { style: s.aspectPctNum }, `p${as.percentile}`),
              e(View, { style: s.aspectBar },
                e(View, { style: { ...s.aspectBarFill, width: `${as.percentile}%`, backgroundColor: color } })
              )
            )
          : null,
        ...renderBlocks(ai?.content, aspect.display_name, as.percentile)
      )
    }).filter(Boolean)

    return e(Page, { key: domain.id, size: 'A4', style: s.page },
      e(View, { style: { ...s.domainSection, marginBottom: 8 } },
        e(View, { style: s.domainHeaderRow },
          e(View, { style: { ...s.domainBar, backgroundColor: color } }),
          e(Text, { style: s.domainName }, domain.display_name),
          ds?.category
            ? e(Text, { style: s.domainCat }, CATEGORY_LABELS[ds.category] || ds.category)
            : null
        ),
        ds?.percentile != null
          ? e(View, { style: s.pctRow },
              e(View, { style: s.pctBox },
                e(Text, { style: s.pctNum }, `p${ds.percentile}`)
              ),
              e(View, { style: s.barTrack },
                e(View, { style: { ...s.barFill, width: `${ds.percentile}%`, backgroundColor: color } })
              )
            )
          : null,
        ...renderBlocks(di?.content, domain.display_name, ds?.percentile)
      ),
      ...aspectViews,
      e(PageNum)
    )
  })

  return e(Document,
    { title: `Informe BFAS — ${profile.full_name}`, author: 'Psych Tests' },
    cover,
    intro,
    ...domainPages
  )
}
