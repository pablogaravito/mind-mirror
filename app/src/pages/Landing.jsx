import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMagicLink(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
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
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Header */}
        <div className="text-center" style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>
            Mind Mirror - Test Psicológicos
          </h1>
          <p>Evaluaciones psicológicas by PGB.</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center">
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📬</div>
              <h3>Revisa tu correo</h3>
              <p className="mt-2">
                Te enviamos un enlace a <strong>{email}</strong>. Haz clic en él
                para ingresar.
              </p>
              <button
                className="btn btn--ghost mt-3"
                onClick={() => setSent(false)}
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                className="btn btn--outline btn--full"
                onClick={handleGoogle}
              >
                <GoogleIcon />
                Continuar con Google
              </button>

              {/* Divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  margin: "1.25rem 0",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--border)",
                  }}
                />
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                >
                  o
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--border)",
                  }}
                />
              </div>

              {/* Magic link */}
              <form
                onSubmit={handleMagicLink}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div className="field">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
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
                >
                  {loading ? "Enviando..." : "Enviar enlace de acceso"}
                </button>
              </form>
            </>
          )}
        </div>

        <p
          className="text-center text-muted mt-3"
          style={{ fontSize: "0.8rem" }}
        >
          Necesitas crear una cuenta para poder guardar tus resultados.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
