import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Dashboard({ profile, isAdmin }) {
  const navigate                          = useNavigate()
  const [assignedTests, setAssignedTests] = useState([])
  const [hasAssignment, setHasAssignment] = useState(false)
  const [allTests, setAllTests]           = useState([])
  const [sessions, setSessions]           = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    isAdmin ? loadAdmin() : loadUser()
  }, [profile.id, isAdmin])

  async function loadUser() {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, display_name, assigned_tests(*, tests(*))')
      .eq('user_id', profile.id)
      .maybeSingle()

    const { data: sessionsData } = await supabase
      .from('test_sessions')
      .select('id, test_id, assigned_test_id, status, completed_at, started_at, scores, tests(name, slug)')
      .eq('user_id', profile.id)
      .order('started_at', { ascending: false })

    if (assignment) {
      setHasAssignment(true)
      const sorted = (assignment.assigned_tests || [])
        .filter(at => at.is_active)
        .sort((a, b) => a.display_order - b.display_order)
      setAssignedTests(sorted)
    } else {
      // No assignment at all — redirect to claim
      navigate('/claim', { replace: true })
      return
    }

    setSessions(sessionsData || [])
    setLoading(false)
  }

  async function loadAdmin() {
    const [{ data: testsData }, { data: sessionsData }] = await Promise.all([
      supabase.from('tests').select('*').eq('is_active', true).order('id'),
      supabase
        .from('test_sessions')
        .select('id, test_id, status, completed_at, started_at, scores, tests(name, slug)')
        .eq('user_id', profile.id)
        .order('started_at', { ascending: false })
        .limit(5),
    ])
    setAllTests(testsData || [])
    setSessions(sessionsData || [])
    setLoading(false)
  }

  if (loading) return <div className="spinner" />

  function getSessionForTest(testId) {
    return sessions.find(s => s.test_id === testId) || null
  }

  function getSessionForAssignment(assignedTestId) {
    return sessions.find(s => s.assigned_test_id === assignedTestId) || null
  }

  return (
    <div className="page">
      <div className="container">

        <div style={{ marginBottom: '2.5rem' }}>
          <h2>Hola, {profile.full_name.split(' ')[0]}</h2>
          <p className="mt-1">
            {isAdmin
              ? 'Bienvenido al panel. Aquí puedes tomar tests o ir al panel de administración.'
              : 'Aquí están tus evaluaciones asignadas.'}
          </p>
        </div>

        {/* Admin: show all tests */}
        {isAdmin && (
          <section>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Tests disponibles</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {allTests.map(test => (
                <TestCard
                  key={test.id}
                  test={test}
                  assignedTestId={null}
                  session={getSessionForTest(test.id)}
                  showResults={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Regular user: assigned tests */}
        {!isAdmin && assignedTests.length > 0 && (
          <section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {assignedTests.map(at => (
                <TestCard
                  key={at.id}
                  test={at.tests}
                  assignedTestId={at.id}
                  session={getSessionForAssignment(at.id)}
                  showResults={at.show_results ?? at.tests?.report_config?.show_results_to_user ?? false}
                />
              ))}
            </div>
          </section>
        )}

        {/* Has assignment but no active tests */}
        {!isAdmin && hasAssignment && assignedTests.length === 0 && (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text)' }}>No tienes evaluaciones pendientes.</p>
            <p className="mt-2" style={{ fontSize: '0.875rem' }}>
              Tu psicólogo te asignará nuevas evaluaciones cuando sea necesario.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

function TestCard({ test, assignedTestId, session, showResults }) {
  if (!test) return null

  const config      = test.display_config || {}
  const allowResume = config.allow_resume !== false
  const itemCount   = test.scoring_config?.aspects?.reduce(
    (acc, a) => acc + a.normal_items.length + a.reverse_items.length, 0
  )

  const isCompleted  = session?.status === 'completed'
  const isInProgress = session?.status === 'in_progress'
  const isAbandoned  = session?.status === 'abandoned'
  const canResume    = isInProgress && allowResume

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ color: 'var(--text)', marginBottom: '0.35rem' }}>{test.name}</h3>
        <p style={{ fontSize: '0.875rem' }}>{test.description}</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        {itemCount && <span>{itemCount} ítems</span>}
        {config.questions_per_page && <span>{config.questions_per_page} por página</span>}
        {isInProgress && (
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>En progreso</span>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        {isAbandoned && (
          <div>
            <span className="badge badge--rejected" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
              Sesión interrumpida
            </span>
            <p style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
              Contacta a tu psicólogo para que te la asigne de nuevo.
            </p>
          </div>
        )}

        {isCompleted && showResults && (
          <Link to={`/results/${session.id}`} className="btn btn--outline btn--full">
            Ver resultados
          </Link>
        )}

        {isCompleted && !showResults && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
            ✓ Completado
          </div>
        )}

        {canResume && (
          <Link to={assignedTestId ? `/test/${test.slug}/${assignedTestId}/resume/${session.id}` : `/test/${test.slug}/admin/resume/${session.id}`} className="btn btn--primary btn--full">
            Continuar
          </Link>
        )}

        {isInProgress && !allowResume && (
          <div>
            <span className="badge badge--rejected" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
              Sesión interrumpida
            </span>
            <p style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
              Contacta a tu psicólogo para que te la asigne de nuevo.
            </p>
          </div>
        )}

        {!session && (
          <Link to={assignedTestId ? `/test/${test.slug}/${assignedTestId}` : `/test/${test.slug}/admin`} className="btn btn--primary btn--full">
            Comenzar
          </Link>
        )}
      </div>
    </div>
  )
}
