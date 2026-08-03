import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";

function NotFound() {
  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide">
        <section className="hero-section">
          <p className="eyebrow">Error 404</p>
          <h1>Esta página no existe.</h1>
          <p className="home-lead">
            El enlace puede estar mal escrito o la página fue movida.
          </p>

          <Link className="btn btn-primary" to="/">
            Volver al inicio
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default NotFound;