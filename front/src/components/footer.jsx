import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="footer-brand">
          <img src="/images/logo.png" alt="Musimo" />
          <p>Música · Significado · Momentos</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Explorar</h4>
            <Link to="/search">Buscar</Link>
            <Link to="/reviews">Reseñas</Link>
            <Link to="/lists">Listas</Link>
          </div>

          <div className="footer-col">
            <h4>Musimo</h4>
            <Link to="/">Sobre Musimo</Link>
            <Link to="/">Contacto</Link>
            <Link to="/">Privacidad</Link>
            <Link to="/">Instagram</Link>
          </div>
        </div>
      </div>

      <p className="footer-copy">© Musimo 2026</p>
    </footer>
  );
}

export default Footer;
