import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ScoreView from "../components/ScoreView";

export default function Results({ session }) {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [scales, setScales] = useState([]);
  const [interps, setInterps] = useState({});
  const [pdfRequest, setPdfRequest] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [sessionId]);

  async function load() {
    const { data: sess, error: sessErr } = await supabase
      .from("test_sessions")
      .select("*, tests(*)")
      .eq("id", sessionId)
      .single();

    if (sessErr || !sess) {
      setError("Sesión no encontrada.");
      setLoading(false);
      return;
    }
    if (sess.user_id !== session.user.id) {
      setError("Acceso denegado.");
      setLoading(false);
      return;
    }
    setData(sess);

    // Check visibility — load the user's assigned_test config for this session
    const { data: assignedTest } = await supabase
      .from("assigned_tests")
      .select("show_results, assignments!inner(user_id)")
      .eq("test_id", sess.test_id)
      .eq("assignments.user_id", session.user.id)
      .maybeSingle();

    const testDefault =
      sess.tests?.report_config?.show_results_to_user ?? false;
    const canSeeResults = assignedTest?.show_results ?? testDefault;

    if (!canSeeResults) {
      setError("Los resultados de esta evaluación no están disponibles.");
      setLoading(false);
      return;
    }

    await loadScalesAndInterps(sess);

    const { data: pdfData } = await supabase
      .from("pdf_requests")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    setPdfRequest(pdfData);
    setLoading(false);
  }

  async function loadScalesAndInterps(sess) {
    const { data: scalesData } = await supabase
      .from("scales")
      .select("*")
      .eq("test_id", sess.test_id)
      .order("display_order");
    setScales(scalesData || []);

    const scores = sess.scores || {};
    const scaleIds = (scalesData || []).map((s) => s.id);
    const cats = [
      ...new Set(
        Object.values(scores)
          .map((s) => s.category)
          .filter(Boolean),
      ),
    ];

    if (scaleIds.length && cats.length) {
      const { data: interpsData } = await supabase
        .from("interpretations")
        .select("*")
        .in("scale_id", scaleIds)
        .in("category", cats);
      const map = {};
      (interpsData || []).forEach((i) => {
        map[`${i.scale_id}_${i.category}`] = i;
      });
      setInterps(map);
    }
  }

  async function requestPdf() {
    setRequesting(true);
    const { data, error } = await supabase
      .from("pdf_requests")
      .insert({ session_id: sessionId, user_id: session.user.id })
      .select()
      .single();
    setRequesting(false);
    if (!error) setPdfRequest(data);
  }

  if (loading) return <div className="spinner" />;
  if (error)
    return (
      <div className="page">
        <div className="container">
          <p style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      </div>
    );

  const reportConfig = data.tests?.report_config || {};

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: "2.5rem" }}>
          <Link
            to="/dashboard"
            style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}
          >
            ← Volver
          </Link>
          <h2 style={{ marginTop: "0.5rem" }}>{data.tests?.name}</h2>
          <p className="mt-1">
            {new Date(data.completed_at).toLocaleDateString("es-PE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <ScoreView scores={data.scores} scales={scales} interps={interps} />

        {/* PDF request */}
        {reportConfig.pdf_available && (
          <div
            className="card"
            style={{ marginTop: "2rem", textAlign: "center", padding: "2rem" }}
          >
            <h3 style={{ color: "var(--text)", marginBottom: "0.5rem" }}>
              Informe completo en PDF
            </h3>
            {!pdfRequest && (
              <>
                <p className="mt-1" style={{ marginBottom: "1.5rem" }}>
                  Solicita tu informe detallado. Un administrador lo aprobará a
                  la brevedad.
                </p>
                <button
                  className="btn btn--primary"
                  onClick={requestPdf}
                  disabled={requesting}
                >
                  {requesting
                    ? "Enviando solicitud..."
                    : "Solicitar informe PDF"}
                </button>
              </>
            )}
            {pdfRequest && (
              <div style={{ marginTop: "0.5rem" }}>
                <span className={`badge badge--${pdfRequest.status}`}>
                  {pdfRequest.status === "pending" && "Solicitud pendiente"}
                  {pdfRequest.status === "approved" &&
                    "Aprobado — descarga disponible"}
                  {pdfRequest.status === "rejected" && "Solicitud rechazada"}
                  {pdfRequest.status === "downloaded" && "Descargado"}
                </span>
                {pdfRequest.status === "pending" && (
                  <p className="mt-2" style={{ fontSize: "0.875rem" }}>
                    Un administrador revisará tu solicitud pronto.
                  </p>
                )}
                {pdfRequest.status === "approved" && (
                  <a
                    className="btn btn--primary mt-3"
                    href={`/api/generate-pdf.cjs?sessionId=${sessionId}`}
                    download
                    style={{ display: "inline-block" }}
                  >
                    Descargar PDF
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
