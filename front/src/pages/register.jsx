import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusMessage from "../components/status-message";
import { useAuth } from "../context/use-auth";
import { registrarUsuario } from "../services/usuarios.service";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
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
    setBusy(true);
    setError("");

    try {
      finish(await registrarUsuario(form));
    } catch (loadError) {
      setError(loadError.message || "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <Link to="/" aria-label="Volver a la presentación de musimo">
          <img src="/images/logo.png" alt="musimo" className="auth-logo" />
        </Link>
        <p className="eyebrow">Tu bitácora empieza acá</p>
        <h1 id="register-title">Crear cuenta</h1>
        <StatusMessage type="error">{error}</StatusMessage>

        <form onSubmit={submit} aria-busy={busy}>
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              autoComplete="name"
              required
              minLength="2"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
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
              onChange={(event) => updateField("password", event.target.value)}
              autoComplete="new-password"
              required
              minLength="8"
              aria-describedby="register-password-help"
            />
            <small id="register-password-help">Mínimo 8 caracteres.</small>
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? "Creando…" : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-switch">¿Ya tenés cuenta? <Link to="/iniciar-sesion">Iniciar sesión</Link></p>
      </section>
    </main>
  );
}
