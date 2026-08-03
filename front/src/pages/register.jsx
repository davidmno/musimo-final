import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarUsuario } from "../services/usuarios.service";
import { registerSchema } from "../schemas/usuarios.schema";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
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
      const data = await registerSchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      });

      await registrarUsuario(data);
      navigate("/login");
    } catch (error) {
      if (error.name === "ValidationError") {
        setError(error.errors[0]);
        return;
      }

      setError("No se pudo crear la cuenta");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img src="/images/logo.png" alt="Musimo" className="auth-logo" />

        <h1>Crear cuenta</h1>

        <form onSubmit={handleSubmit}>
          <label>Nombre</label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />

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
            Crear cuenta
          </button>
          <p className="auth-switch">
            ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Register;
