// api/score-session.js
// Vercel serverless function
// POST { sessionId, testId }
// Reads scoring_config from DB, computes scores, updates the session.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role — can bypass RLS
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sessionId, testId } = req.body
  if (!sessionId || !testId) {
    return res.status(400).json({ error: 'Missing sessionId or testId' })
  }

  try {
    // 1. Load test (for scoring_config and norm_type)
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('scoring_config, norm_type')
      .eq('id', testId)
      .single()

    if (testErr || !test) throw new Error('Test not found')

    // 2. Load all responses for this session
    const { data: responses, error: respErr } = await supabase
      .from('test_responses')
      .select('item_id, response_value, test_items(item_index)')
      .eq('session_id', sessionId)

    if (respErr) throw new Error('Could not load responses')

    // Build a map: item_index → response_value
    const responseMap = {}
    responses.forEach(r => {
      const idx = r.test_items?.item_index
      if (idx !== undefined) responseMap[idx] = r.response_value
    })

    // 3. Load scales for display info
    const { data: scales } = await supabase
      .from('scales')
      .select('id, slug, display_name, scale_type, domain_id, color')
      .eq('test_id', testId)

    const scaleById   = {}
    const scaleBySlug = {}
    scales.forEach(s => { scaleById[s.id] = s; scaleBySlug[s.slug] = s })

    // 4. Compute scores based on norm_type
    let scores = {}

    if (test.norm_type === 'lookup_table') {
      scores = await scoreLookupTable(test.scoring_config, responseMap, scaleById, testId)
    } else if (test.norm_type === 'raw_sum') {
      scores = scoreRawSum(test.scoring_config, responseMap, scaleById)
    }

    // 5. Save scores + mark session completed
    const { error: updateErr } = await supabase
      .from('test_sessions')
      .update({
        scores,
        status:       'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateErr) throw new Error('Could not save scores')

    return res.status(200).json({ success: true, scores })

  } catch (err) {
    console.error('score-session error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}

// ─────────────────────────────────────────────────────────────
// LOOKUP TABLE scoring (BFAS)
// Uses scoring_config.aspects + scoring_config.domains
// Looks up percentile from scoring_norms table
// ─────────────────────────────────────────────────────────────
async function scoreLookupTable(config, responseMap, scaleById, testId) {
  const scores = {}
  const { aspects = [], domains = [] } = config

  // Load all norms for this test's scales in one query
  const scaleIds = [...aspects.map(a => a.scale_id), ...domains.map(d => d.scale_id)]
  const { data: norms } = await supabase
    .from('scoring_norms')
    .select('scale_id, raw_score, percentile')
    .in('scale_id', scaleIds)

  // Build norms lookup: { scale_id: { raw_score: percentile } }
  const normsMap = {}
  norms.forEach(n => {
    if (!normsMap[n.scale_id]) normsMap[n.scale_id] = {}
    normsMap[n.scale_id][n.raw_score] = n.percentile
  })

  // Score each aspect
  const aspectRawScores = {}
  aspects.forEach(aspect => {
    const { scale_id, normal_items = [], reverse_items = [] } = aspect

    let raw = 0
    normal_items.forEach(idx  => { raw += responseMap[idx] ?? 0 })
    reverse_items.forEach(idx => { raw += 4 - (responseMap[idx] ?? 0) })

    const percentile = normsMap[scale_id]?.[raw] ?? 0
    const category   = getCategory(percentile)
    const scaleInfo  = scaleById[scale_id] || {}

    scores[scaleInfo.slug || scale_id] = {
      scale_id,
      raw,
      percentile,
      category,
      type:         'aspect',
      display_name: scaleInfo.display_name,
    }

    aspectRawScores[scale_id] = raw
  })

  // Score each domain (sum of its two aspect raw scores)
  domains.forEach(domain => {
    const { scale_id, aspect_ids = [] } = domain
    const raw        = aspect_ids.reduce((sum, aid) => sum + (aspectRawScores[aid] ?? 0), 0)
    const percentile = normsMap[scale_id]?.[raw] ?? 0
    const category   = getCategory(percentile)
    const scaleInfo  = scaleById[scale_id] || {}

    scores[scaleInfo.slug || scale_id] = {
      scale_id,
      raw,
      percentile,
      category,
      type:         'domain',
      display_name: scaleInfo.display_name,
    }
  })

  return scores
}

// ─────────────────────────────────────────────────────────────
// RAW SUM scoring (PHQ-9, GAD-7 style)
// Uses scoring_config.total_scale_id or subscales
// ─────────────────────────────────────────────────────────────
function scoreRawSum(config, responseMap, scaleById) {
  const scores = {}
  const { total_scale_id, subscales = [], all_items_normal } = config

  if (total_scale_id) {
    const scale = scaleById[total_scale_id] || {}
    const raw   = Object.values(responseMap).reduce((sum, v) => sum + v, 0)
    scores[scale.slug || total_scale_id] = {
      scale_id:     total_scale_id,
      raw,
      percentile:   null,
      category:     null,
      type:         'total',
      display_name: scale.display_name,
    }
  }

  return scores
}

// ─────────────────────────────────────────────────────────────
// Category from percentile (mirrors your Java BfasOperations)
// ─────────────────────────────────────────────────────────────
function getCategory(pct) {
  if (pct <= 3)  return 'exc_low'
  if (pct <= 10) return 'very_low'
  if (pct <= 22) return 'low'
  if (pct <= 40) return 'mod_low'
  if (pct <= 58) return 'avg'
  if (pct <= 76) return 'mod_high'
  if (pct <= 88) return 'high'
  if (pct <= 95) return 'very_high'
  return 'exc_high'
}
