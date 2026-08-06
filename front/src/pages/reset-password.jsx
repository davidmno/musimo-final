import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusMessage from "../components/status-message";
import { resetPassword } from "../services/usuarios.service";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ password: "", repeat: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.repeat) {
      setStatus({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    setBusy(true);
    setStatus({ type: "", text: "" });
    try {
      const result = await resetPassword(token, form.password);
      setStatus({ type: "success", text: result.message });
      setDone(true);
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <Link to="/" aria-label="Volver a la presentación de musimo">
          <img src="/images/logo.png" alt="musimo" className="auth-logo" />
        </Link>
        <h1 id="reset-title">Nueva contraseña</h1>
        <StatusMessage type={status.type}>
          {status.text || (!token ? "El enlace no es válido." : "")}
        </StatusMessage>

        {!done && token && (
          <form onSubmit={submit} aria-busy={busy}>
            <label>
              Nueva contraseña
              <input
                type="password"
                minLength="8"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Repetir contraseña
              <input
                type="password"
                minLength="8"
                value={form.repeat}
                onChange={(event) => setForm((current) => ({ ...current, repeat: event.target.value }))}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
        {done && <Link className="btn btn-primary" to="/iniciar-sesion">Iniciar sesión</Link>}
      </section>
    </main>
  );
}
