import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Dashboard({ profile }) {
  const [tests, setTests]       = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: testsData }, { data: sessionsData }] = await Promise.all([
        supabase.from('tests').select('*').eq('is_active', true).order('id'),
        supabase
          .from('test_sessions')
          .select('id, test_id, status, completed_at, scores, tests(name, slug)')
          .eq('user_id', profile.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(10),
      ])
      setTests(testsData || [])
      setSessions(sessionsData || [])
      setLoading(false)
    }
    load()
  }, [profile.id])

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <div className="container">

        {/* Greeting */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2>Hola, {profile.full_name.split(' ')[0]}</h2>
          <p className="mt-1">Selecciona un test para comenzar o revisa tus resultados anteriores.</p>
        </div>

        {/* Available tests */}
        <section>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Tests disponibles</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {tests.map(test => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        </section>

        {/* Past sessions */}
        {sessions.length > 0 && (
          <section style={{ marginTop: '3rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Resultados anteriores</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.map(s => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

function TestCard({ test }) {
  const config = test.display_config || {}
  const items  = test.scoring_config?.aspects?.reduce((acc, a) => acc + a.normal_items.length + a.reverse_items.length, 0)

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ color: 'var(--text)', marginBottom: '0.35rem' }}>{test.name}</h3>
        <p style={{ fontSize: '0.875rem' }}>{test.description}</p>
      </div>
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {items && <span>{items} ítems</span>}
        {config.questions_per_page && <span>{config.questions_per_page} por página</span>}
      </div>
      <Link
        to={`/test/${test.slug}`}
        className="btn btn--primary"
        style={{ marginTop: 'auto' }}
      >
        Comenzar
      </Link>
    </div>
  )
}

function SessionRow({ session }) {
  const date = new Date(session.completed_at).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
      <div>
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{session.tests?.name}</span>
        <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{date}</span>
      </div>
      <Link to={`/results/${session.id}`} className="btn btn--outline" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
        Ver resultados
      </Link>
    </div>
  )
}
