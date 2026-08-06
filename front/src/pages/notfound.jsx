import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { useAuth } from "../context/use-auth";

export default function NotFound() {
  const { token } = useAuth();
  const startPath = token ? "/inicio" : "/";

  return (
    <div className="app-body">
      {token && <Navbar />}
      <main className="app-page app-page-wide not-found-page">
        <section className="not-found-card" aria-labelledby="not-found-title">
          <p className="not-found-code" aria-hidden="true">404</p>
          <p className="eyebrow">El lado B del sitio</p>
          <h1 id="not-found-title">Esta página no existe.</h1>
          <p>El enlace puede estar incompleto, haber cambiado o llevar a una historia que ya no está disponible.</p>
          <div className="not-found-actions">
            <Link className="btn btn-primary" to={startPath}>Volver al inicio</Link>
            {token && <Link className="btn btn-secondary" to="/buscar">Explorar lanzamientos</Link>}
          </div>
        </section>
      </main>
      {token && <Footer />}
    </div>
  );
}
