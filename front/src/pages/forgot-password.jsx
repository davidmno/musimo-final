import { useState } from "react";
import { Link } from "react-router-dom";
import StatusMessage from "../components/status-message";
import { requestPasswordReset } from "../services/usuarios.service";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      setResult(await requestPasswordReset(email));
    } catch (loadError) {
      setError(loadError.message || "No se pudo enviar el enlace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-title">
        <Link to="/" aria-label="Volver a la presentación de musimo">
          <img src="/images/logo.png" alt="musimo" className="auth-logo" />
        </Link>
        <h1 id="forgot-title">Recuperar contraseña</h1>
        <p>Te vamos a enviar un enlace para elegir una nueva.</p>
        <StatusMessage type="error">{error}</StatusMessage>
        <StatusMessage type="success">{result?.message}</StatusMessage>
        {result?.resetUrl && (
          <p className="dev-reset-link">Modo local: <a href={result.resetUrl}>abrir enlace de recuperación</a></p>
        )}

        <form onSubmit={submit} aria-busy={busy}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
        <p className="auth-switch"><Link to="/iniciar-sesion">Volver al inicio de sesión</Link></p>
      </section>
    </main>
  );
}
