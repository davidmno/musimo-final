import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="footer-brand">
          <img src="/images/logo.png" alt="musimo" />
          <p>Música · Significado · Momentos</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Explorar</h4>
            <Link to="/buscar">Buscar</Link>
            <Link to="/resenas">Reseñas</Link>
            <Link to="/comunidad?tipo=listas">Listas</Link>
          </div>

          <div className="footer-col">
            <h4>musimo</h4>
            <Link to="/">Sobre musimo</Link>
            <Link to="/">Contacto</Link>
            <Link to="/">Privacidad</Link>
            <Link to="/">Instagram</Link>
          </div>
        </div>
      </div>

      <p className="footer-copy">© musimo 2026</p>
    </footer>
  );
}

export default Footer;
