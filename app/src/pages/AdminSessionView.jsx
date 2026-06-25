import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ScoreView from "../components/ScoreView";

export default function AdminSessionView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sess, setSess] = useState(null);
  const [scales, setScales] = useState([]);
  const [interps, setInterps] = useState({});
  const [responses, setResponses] = useState([]); // raw item responses
  const [showResponses, setShowResponses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [sessionId]);

  async function load() {
    const { data, error: err } = await supabase
      .from("test_sessions")
      .select("*, tests(*), profiles:user_id(full_name, birth_date, gender)")
      .eq("id", sessionId)
      .single();

    if (err || !data) {
      setError("Sesión no encontrada.");
      setLoading(false);
      return;
    }
    setSess(data);

    // Scales
    const { data: scalesData } = await supabase
      .from("scales")
      .select("*")
      .eq("test_id", data.test_id)
      .order("display_order");
    setScales(scalesData || []);

    // Interpretations
    const scores = data.scores || {};
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

    // Raw responses
    const { data: respData } = await supabase
      .from("test_responses")
      .select(
        "response_value, answered_at, test_items(item_number, text, is_reversed, aspect)",
      )
      .eq("session_id", sessionId)
      .order("test_items(item_number)");
    setResponses(respData || []);

    setLoading(false);
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

  const profile = sess.profiles;
  const completedDate = sess.completed_at
    ? new Date(sess.completed_at).toLocaleDateString("es-PE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <button
            className="btn btn--ghost"
            style={{
              padding: 0,
              marginBottom: "0.75rem",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
            }}
            onClick={() => navigate("/admin")}
          >
            ← Volver al panel
          </button>

          <h2>{sess.tests?.name}</h2>

          {/* Person info */}
          <div
            style={{
              marginTop: "0.75rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
            }}
          >
            <span>
              <strong style={{ color: "var(--text)" }}>Persona:</strong>{" "}
              {profile?.full_name || "—"}
            </span>
            <span>
              <strong style={{ color: "var(--text)" }}>
                Fecha de nacimiento:
              </strong>{" "}
              {profile?.birth_date || "—"}
            </span>
            <span>
              <strong style={{ color: "var(--text)" }}>Género:</strong>{" "}
              {profile?.gender || "—"}
            </span>
            <span>
              <strong style={{ color: "var(--text)" }}>Completado:</strong>{" "}
              {completedDate}
            </span>
          </div>
        </div>

        {/* Scores + interpretations — shared component */}
        <ScoreView scores={sess.scores} scales={scales} interps={interps} />

        {/* Raw responses section */}
        {responses.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <button
              className="btn btn--outline"
              onClick={() => setShowResponses((r) => !r)}
              style={{ marginBottom: "1rem" }}
            >
              {showResponses
                ? "Ocultar respuestas individuales ↑"
                : "Ver respuestas individuales ↓"}
            </button>

            {showResponses && (
              <div className="card" style={{ padding: "1.25rem" }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "0" }}
                >
                  {responses.map((r, idx) => {
                    const item = r.test_items;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2rem 1fr 3rem 6rem",
                          gap: "0.75rem",
                          alignItems: "center",
                          padding: "0.6rem 0",
                          borderBottom:
                            idx < responses.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                          fontSize: "0.875rem",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-muted)",
                            textAlign: "right",
                          }}
                        >
                          {item?.item_number}
                        </span>
                        <span style={{ color: "var(--text)" }}>
                          {item?.text}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--accent)",
                            textAlign: "center",
                            fontSize: "1rem",
                          }}
                        >
                          {r.response_value}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            background: "var(--bg)",
                            borderRadius: "6px",
                            padding: "0.15rem 0.4rem",
                            textAlign: "center",
                          }}
                        >
                          {item?.aspect || ""}
                          {item?.is_reversed ? " (R)" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.75rem",
                  }}
                >
                  (R) indica ítem inverso (el valor fue invertido para el
                  puntaje).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
