import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { getToReviewList } from "../services/to-review.service";
import { getReviews } from "../services/reviews.service";
import { getLists } from "../services/lists.service";
import { getRecentMusicReleases } from "../services/musicbrainz.service";
import Footer from "../components/footer";
import { getAlbumUrl } from "../services/album-link.service";

const recentReleasesFallback = [
  {
    album: "you seem pretty sad for a girl so in love",
    artist: "Olivia Rodrigo",
    year: 2026,
    type: "Álbum",
    image: "/images/cover-placeholder.png",
  },
  {
    album: "Dirty Blonde",
    artist: "Bebe Rexha",
    year: 2026,
    type: "Álbum",
    image: "/images/cover-placeholder.png",
  },
  {
    album: "Dinner Party",
    artist: "Niall Horan",
    year: 2026,
    type: "Álbum",
    image: "/images/cover-placeholder.png",
  },
  {
    album: "BITCH",
    artist: "Lizzo",
    year: 2026,
    type: "Álbum",
    image: "/images/cover-placeholder.png",
  },
  {
    album: "girls like girls the album",
    artist: "Hayley Kiyoko",
    year: 2026,
    type: "Álbum",
    image: "/images/cover-placeholder.png",
  },
  {
    album: "Songs for Young Lovers",
    artist: "Johnny Orlando",
    year: 2026,
    type: "Álbum",
    image: "/images/cover-placeholder.png",
  },
];


function HomeSection({ title, children, linkTo }) {
  return (
    <section className="home-section">
      <div className="section-header">
        <div>
          <h2 className="section-heading">{title}</h2>
        </div>

        {linkTo && (
          <Link to={linkTo} className="section-link">
            Ver todo
          </Link>
        )}
      </div>

      <div className="carousel">
        <div className="carousel-track">{children}</div>
      </div>
    </section>
  );
}

function ReleaseCard({ release }) {
  return (
    <Link to={getAlbumUrl(release)} className="carousel-card release-card">
      <img src={release.image} alt={release.album} />

      <div className="release-card-body">
        <h3>{release.album}</h3>
        <p>{release.artist}</p>
        <span className="release-meta">
          {release.year} · {release.type}
        </span>
      </div>
    </Link>
  );
}

function ReviewCard({ review }) {
  return (
    <Link to={`/review/${review._id}`} className="carousel-card story-card">
      <p className="story-user">{review.username || "Usuario"}</p>
      <h3>{review.album}</h3>
      <p className="story-artist">{review.artist}</p>
      <p className="story-excerpt">
        {review.text.slice(0, 100)}
        {review.text.length > 100 ? "…" : ""}
      </p>
    </Link>
  );
}

function ListCard({ list }) {
  const albums = list.albums || [];
  const covers = albums
    .map((album) => album.image)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <Link to="/lists" className="carousel-card list-card">
      <div className="list-stack">
        {covers.map((cover, index) => (
          <img key={cover} src={cover} alt="" style={{ "--i": index }} />
        ))}
      </div>

      <h3>{list.title}</h3>
      <p>
        {albums.length} lanzamientos · {list.ownerName || list.owner || "Comunidad"}
      </p>
    </Link>
  );
}

function Home() {
  const [toReview, setToReview] = useState([]);
  const [personalizedReleases, setPersonalizedReleases] = useState([]);
  const [communityReviews, setCommunityReviews] = useState([]);
  const [communityLists, setCommunityLists] = useState([]);

  useEffect(() => {
    const currentToReview = getToReviewList();

    setToReview(currentToReview);
    loadRecentReleases();
    loadCommunityReviews();
    loadCommunityLists();

    function handleStorage() {
      const currentToReview = getToReviewList();

      setToReview(currentToReview);
      loadRecentReleases();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
    };
  }, []);

  async function loadRecentReleases() {
    try {
      const data = await getRecentMusicReleases();
      setPersonalizedReleases(data.slice(0, 6));
    } catch {
      setPersonalizedReleases(recentReleasesFallback.slice(0, 6));
    }
  }

  async function loadCommunityReviews() {
    try {
      const data = await getReviews();
      setCommunityReviews(data.slice(0, 8));
    } catch {
      setCommunityReviews([]);
    }
  }

  async function loadCommunityLists() {
    try {
      const data = await getLists();
      setCommunityLists(data.slice(0, 8));
    } catch {
      setCommunityLists([]);
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide">
        <HomeSection title="Por reseñar" linkTo="/profile">
          {toReview.length > 0 ? (
            toReview.map((release) => (
              <ReleaseCard
                key={`${release.artist}-${release.album}`}
                release={release}
              />
            ))
          ) : (
            <div className="empty-state-block carousel-empty">
              <p className="empty-state">
                Todavía no guardaste lanzamientos para reseñar.
              </p>

              <Link className="btn btn-primary" to="/search">
                Buscar música
              </Link>
            </div>
          )}
        </HomeSection>

        <HomeSection title="Lanzamientos recientes" linkTo="/search">
          {(personalizedReleases.length > 0
            ? personalizedReleases
            : recentReleasesFallback.slice(0, 6)
          )
            .slice(0, 6)
            .map((release) => (
              <ReleaseCard
                key={`${release.artist}-${release.album}`}
                release={release}
              />
            ))}
        </HomeSection>

        <HomeSection title="Últimas reseñas" linkTo="/profile">
          {communityReviews.length > 0 ? (
            communityReviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
              />
            ))
          ) : (
            <div className="empty-state-block carousel-empty">
              <p className="empty-state">
                Todavía no hay reseñas publicadas.
              </p>

              <Link className="btn btn-primary" to="/search">
                Buscar música
              </Link>
            </div>
          )}
        </HomeSection>

        <HomeSection title="Listas de la comunidad" linkTo="/lists">
          {communityLists.length > 0 ? (
            communityLists.map((list) => (
              <ListCard key={list._id} list={list} />
            ))
          ) : (
            <div className="empty-state-block carousel-empty">
              <p className="empty-state">
                Todavía no hay listas publicadas.
              </p>

              <Link className="btn btn-primary" to="/lists">
                Crear lista
              </Link>
            </div>
          )}
        </HomeSection>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
