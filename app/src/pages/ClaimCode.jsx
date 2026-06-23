import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ClaimCode({ profile, session }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // check if already has assignment
  const [error, setError] = useState("");

  useEffect(() => {
    // If user already has a claimed assignment, go straight to dashboard
    async function checkExisting() {
      const { data } = await supabase
        .from("assignments")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) navigate("/dashboard", { replace: true });
      else setChecking(false);
    }
    checkExisting();
  }, [session.user.id, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmed = code.trim().toUpperCase();

    // Look up the code
    const { data: assignment, error: fetchErr } = await supabase
      .from("assignments")
      .select("id, user_id, status")
      .eq("claim_code", trimmed)
      .maybeSingle();

    if (fetchErr || !assignment) {
      setError(
        "Código no encontrado. Verifica que lo hayas escrito correctamente.",
      );
      setLoading(false);
      return;
    }

    if (assignment.user_id) {
      setError("Este código ya fue utilizado.");
      setLoading(false);
      return;
    }

    // Claim it
    const { data: claimData, error: claimErr } = await supabase
      .from("assignments")
      .update({
        user_id: session.user.id,
        claimed_at: new Date().toISOString(),
        status: "claimed",
      })
      .eq("id", assignment.id)
      .is("user_id", null)
      .select();

    console.log("claim result:", claimData, claimErr);

    if (claimErr || !claimData?.length) {
      setError(
        `No se pudo canjear el código. ${claimErr?.message || "El código no pudo ser actualizado."}`,
      );
      setLoading(false);
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  if (checking)
    return <div className="spinner" style={{ marginTop: "6rem" }} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div className="text-center" style={{ marginBottom: "2rem" }}>
          <h2>Ingresa tu código</h2>
          <p className="mt-1">
            Tu psicólogo te habrá enviado un código de acceso. Ingrésalo a
            continuación para ver tus evaluaciones.
          </p>
        </div>

        <div className="card">
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div className="field">
              <label htmlFor="code">Código de acceso</label>
              <input
                id="code"
                type="text"
                placeholder="Ej. XK7F2"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={10}
                required
                style={{
                  textAlign: "center",
                  fontSize: "1.4rem",
                  letterSpacing: "0.2em",
                  fontWeight: 600,
                }}
              />
            </div>

            {error && (
              <p
                style={{
                  color: "var(--danger)",
                  fontSize: "0.875rem",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <button
              className="btn btn--primary btn--full"
              type="submit"
              disabled={loading || !code.trim()}
            >
              {loading ? "Verificando..." : "Continuar"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-muted mt-3"
          style={{ fontSize: "0.8rem" }}
        >
          ¿No tienes un código? Contacta a tu psicólogo.
        </p>
      </div>
    </div>
  );
}
