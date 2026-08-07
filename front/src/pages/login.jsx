import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusMessage from "../components/status-message";
import { useAuth } from "../context/use-auth";
import { loginUsuario } from "../services/usuarios.service";

const SAVED_LOGIN_EMAIL = "musimo-login-email";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState(() => ({
    email: window.localStorage.getItem(SAVED_LOGIN_EMAIL) || "",
    password: "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finish = useCallback(
    (user) => {
      login(user);
      navigate("/inicio", { replace: true });
    },
    [login, navigate],
  );

  async function submit(event) {
    event.preventDefault();
    window.localStorage.setItem(SAVED_LOGIN_EMAIL, form.email.trim());
    setBusy(true);
    setError("");

    try {
      finish(await loginUsuario(form));
    } catch (loadError) {
      setError(loadError.message || "Email o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  }

  function updateEmail(email) {
    setForm((current) => ({ ...current, email }));
    window.localStorage.setItem(SAVED_LOGIN_EMAIL, email);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <Link to="/" aria-label="Volver a la presentación de musimo">
          <img src="/images/logo.png" alt="musimo" className="auth-logo" />
        </Link>
        <p className="eyebrow">Volvé a tus historias</p>
        <h1 id="login-title">Iniciar sesión</h1>
        <StatusMessage type="error">{error}</StatusMessage>

        <form onSubmit={submit} aria-busy={busy}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="current-password"
              required
            />
          </label>
          <Link className="forgot-link" to="/recuperar-contrasena">Olvidé mi contraseña</Link>
          <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="auth-switch">¿Todavía no tenés cuenta? <Link to="/registro">Crear cuenta</Link></p>
      </section>
    </main>
  );
}
