import { Link } from "react-router-dom";

const landingReviews = [
  {
    username: "Lucía",
    album: "Blonde",
    artist: "Frank Ocean",
    cover: "/images/covers/blonde.jpg",
    excerpt:
      "Lo escuché entero en un viaje en tren. Desde entonces, cada vez que llueve pienso en «Pink + White».",
    tags: ["Viaje", "Melancolía"],
  },
  {
    username: "Martín",
    album: "Channel Orange",
    artist: "Frank Ocean",
    cover: "/images/covers/channel-orange.jpg",
    excerpt:
      "No fue la crítica lo que me quedó: fue la sensación de que alguien había puesto en palabras algo que yo no sabía nombrar.",
    tags: ["Descubrimiento", "Crecimiento"],
  },
  {
    username: "Sofi",
    album: "Fever",
    artist: "Kylie Minogue",
    cover: "/images/covers/fever.jpg",
    excerpt:
      "Mi hermana y yo lo pusimos en loop un verano entero. Todavía huele a protector solar y vereda caliente.",
    tags: ["Hogar", "Euforia"],
  },
];

function App() {
  return (
    <div className="landing-page">
      <div
        className="landing-texture landing-texture--page"
        aria-hidden="true"
      />

      <header className="landing-nav">
        <Link to="/" className="logo" aria-label="Musimo">
          <img src="/images/logo.png" alt="Musimo" />
        </Link>

        <Link to="/login" className="btn btn-primary">
          Entrar
        </Link>
      </header>

      <section className="landing-hero landing-section--textured">
        <div className="landing-glow landing-glow--hero" aria-hidden="true" />

        <div className="hero-copy">
          <h1>La música no debería tratarse de números, sino de momentos.</h1>

          <p className="hero-desc">
            Registrá reseñas, significados y momentos asociados a los
            lanzamientos que marcaron tu vida.
          </p>

          <Link to="/login" className="btn btn-primary">
            Entrar a Musimo
          </Link>
        </div>

        <div className="hero-visual">
          <div className="hero-composition">
            <div className="hero-resonance" aria-hidden="true">
              <img
                src="/images/trama-musimo-aislada.svg"
                alt=""
                className="hero-resonance-trama"
              />
              <span className="hero-resonance-ring hero-resonance-ring--outer" />
              <span className="hero-resonance-ring hero-resonance-ring--inner" />
              <img
                src="/images/musimo-isotipo-naranja.svg"
                alt=""
                className="hero-isotipo"
              />
            </div>

            <article className="hero-mock-card">
              <div className="hero-mock-card-head">
                <img
                  src="/images/covers/fever.jpg"
                  alt=""
                  className="hero-mock-cover"
                />
                <div>
                  <p className="hero-mock-album">Fever</p>
                  <p className="hero-mock-artist">Kylie Minogue</p>
                </div>
              </div>

              <p className="hero-mock-excerpt">
                Mi hermana y yo lo pusimos en loop un verano entero. Todavía
                huele a protector solar y vereda caliente.
              </p>

              <div className="tag-list">
                <span className="tag tag-chip tag-green">Hogar</span>
                <span className="tag tag-chip">Euforia</span>
              </div>
            </article>

            <div className="hero-float-covers" aria-hidden="true">
              <img
                src="/images/covers/melodrama.jpg"
                alt=""
                style={{ "--i": 0 }}
              />
              <img
                src="/images/covers/channel-orange.jpg"
                alt=""
                style={{ "--i": 1 }}
              />
              <img src="/images/covers/kid-a.jpg" alt="" style={{ "--i": 2 }} />
            </div>

            <div className="hero-float-tags" aria-hidden="true">
              <span className="hero-float-tag">Hogar</span>
              <span className="hero-float-tag">Viaje</span>
              <span className="hero-float-tag">Descubrimiento</span>
              <span className="hero-float-tag">Noche</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section alt landing-section--textured landing-section--green">
        <div className="landing-glow landing-glow--intro" aria-hidden="true" />

        <div className="section-inner">
          <p className="section-eyebrow">¿Qué es Musimo?</p>

          <div className="landing-what">
            <h2 className="section-title">Un archivo de recuerdos musicales</h2>
            <p className="section-desc">
              Somos una plataforma social de reseñas musicales que permite
              catalogar, compartir y conservar recuerdos vinculados a la música.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section alt landing-section--textured landing-section--green">
        <div className="landing-glow landing-glow--steps" aria-hidden="true" />

        <div className="section-inner">
          <p className="section-eyebrow">¿Cómo funciona?</p>
          <h2 className="section-title">Cuatro pasos, una historia</h2>

          <div className="steps-grid">
            <article className="step-card">
              <div className="step-num">1</div>
              <h3>Elegí un lanzamiento</h3>
              <p>Buscá el álbum o sencillo que querés reseñar.</p>
            </article>

            <article className="step-card">
              <div className="step-num">2</div>
              <h3>Escribí una reseña</h3>
              <p>Contá lo que te hizo pensar, sentir o recordar.</p>
            </article>

            <article className="step-card">
              <div className="step-num">3</div>
              <h3>Agregá un significado</h3>
              <p>
                Etiquetá el contexto: un viaje, una noche, un descubrimiento.
              </p>
            </article>

            <article className="step-card">
              <div className="step-num">4</div>
              <h3>Vinculá un momento</h3>
              <p>Una persona, un lugar o una etapa asociada al sonido.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section alt">
        <div className="section-inner">
          <p className="section-eyebrow">Ejemplos</p>
          <h2 className="section-title">Reseñas con alma</h2>

          <div className="mock-reviews">
            {landingReviews.map((review) => (
              <article
                className="mock-card mock-card--editorial"
                key={review.album}
              >
                <img
                  src={review.cover}
                  alt={review.album}
                  className="mock-card-cover"
                  loading="lazy"
                />

                <div className="mock-card-body">
                  <div className="mock-card-header">
                    <span className="mock-card-user">{review.username}</span>
                    <span className="mock-card-album">
                      {review.album} · {review.artist}
                    </span>
                  </div>

                  <p>{review.excerpt}</p>

                  <div className="tag-list">
                    {review.tags.map((tag) => (
                      <span
                        className={`tag tag-chip ${
                          tag === "Hogar" || tag === "Descubrimiento"
                            ? "tag-green"
                            : ""
                        }`}
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--textured">
        <div className="landing-glow landing-glow--quote" aria-hidden="true" />

        <div className="section-inner">
          <div className="meaning-block">
            <blockquote className="meaning-quote">
              Menos algoritmos. Más significado.
            </blockquote>

            <div className="meaning-body">
              <p>
                Las plataformas optimizan para reproducciones. Musimo optimiza
                para memoria: lo que un disco te dijo, dónde estabas cuando lo
                escuchaste, por qué todavía lo volvés a poner.
              </p>

              <Link to="/login" className="btn btn-primary">
                Entrar a Musimo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer landing-section--textured">
        <div className="landing-footer-inner">
          <img
            src="/images/logo.svg"
            alt="Musimo"
            className="landing-footer-logo"
          />
          <p>© Musimo 2026 · Música · Significado · Momentos</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
