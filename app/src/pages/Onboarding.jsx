import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Onboarding({
  session,
  onComplete,
  redirectTo = "/dashboard",
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        birth_date: form.birth_date,
        gender: form.gender,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    setLoading(false);

    if (error) {
      setError("No se pudo guardar tu información. Intenta de nuevo.");
      return;
    }

    await onComplete(session.user.id);
    navigate(redirectTo);
  }

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
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div className="text-center" style={{ marginBottom: "2rem" }}>
          <h2>Antes de comenzar</h2>
          <p className="mt-1">
            Necesitamos algunos datos básicos. Solo los pedimos una vez.
          </p>
        </div>

        <div className="card">
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div className="field">
              <label htmlFor="full_name">Nombre completo</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Ej. María García López"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="birth_date">Fecha de nacimiento</label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                value={form.birth_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="gender">Género</label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Selecciona una opción
                </option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="prefer_not_to_say">Prefiero no decir</option>
              </select>
            </div>

            {error && (
              <p style={{ color: "var(--danger)", fontSize: "0.875rem" }}>
                {error}
              </p>
            )}

            <button
              className="btn btn--primary btn--full"
              type="submit"
              disabled={loading}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? "Guardando..." : "Continuar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
