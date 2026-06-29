// api/generate-pdf.js
// GET /api/generate-pdf?sessionId=xxx
// Checks PDF request is approved, generates and streams the PDF.

import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import BfasReport from './pdf-template.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sessionId } = req.query
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' })
  }

  try {
    // 1. Verify there is an approved PDF request for this session
    const { data: pdfReq, error: pdfErr } = await supabase
      .from('pdf_requests')
      .select('id, status, user_id')
      .eq('session_id', sessionId)
      .eq('status', 'approved')
      .maybeSingle()

    if (pdfErr || !pdfReq) {
      return res.status(403).json({ error: 'No approved PDF request found for this session.' })
    }

    // 2. Load session + test
    const { data: session, error: sessErr } = await supabase
      .from('test_sessions')
      .select('*, tests(*)')
      .eq('id', sessionId)
      .single()

    if (sessErr || !session) {
      return res.status(404).json({ error: 'Session not found.' })
    }

    // 3. Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, birth_date, gender')
      .eq('id', session.user_id)
      .single()

    // 4. Load scales
    const { data: scales } = await supabase
      .from('scales')
      .select('*')
      .eq('test_id', session.test_id)
      .order('display_order')

    // 5. Load interpretations
    const scores   = session.scores || {}
    const scaleIds = (scales || []).map(s => s.id)
    const cats     = [...new Set(Object.values(scores).map(s => s.category).filter(Boolean))]

    const { data: interpsData } = await supabase
      .from('interpretations')
      .select('*')
      .in('scale_id', scaleIds)
      .in('category', cats)

    const interps = {}
    ;(interpsData || []).forEach(i => {
      interps[`${i.scale_id}_${i.category}`] = i
    })

    // 6. Generate PDF
    const doc = createElement(BfasReport, {
      profile:  profile || { full_name: 'Usuario' },
      session,
      scales:   scales || [],
      interps,
    })

    const buffer = await renderToBuffer(doc)

    // 7. Mark as downloaded
    await supabase
      .from('pdf_requests')
      .update({ status: 'downloaded' })
      .eq('id', pdfReq.id)

    // 8. Stream PDF to client
    const filename = `informe-bfas-${(profile?.full_name || 'usuario').toLowerCase().replace(/\s+/g, '-')}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)
    res.status(200).send(buffer)

  } catch (err) {
    console.error('generate-pdf error:', err)
    res.status(500).json({ error: 'Error generating PDF.' })
  }
}
