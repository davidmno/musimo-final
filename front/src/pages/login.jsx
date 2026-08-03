import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUsuario } from "../services/usuarios.service";
import { useAuth } from "../context/auth-context";
import { loginSchema } from "../schemas/usuarios.schema";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await loginSchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      });

      const usuario = await loginUsuario(data);
      login(usuario);
      navigate("/home");
    } catch (error) {
      if (error.name === "ValidationError") {
        setError(error.errors[0]);
        return;
      }

      setError("Email o contraseña incorrectos");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src="/images/logo.png" alt="Musimo" className="auth-logo" />

        <h1>Iniciar sesión</h1>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Contraseña</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn-primary" type="submit">
            Entrar
          </button>
          <p className="auth-switch">
            ¿Todavía no tenés cuenta? <Link to="/register">Crear cuenta</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;
