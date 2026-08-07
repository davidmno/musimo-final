import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { Avatar, ListCard, ReviewCard } from "../components/content-cards";
import StatusMessage from "../components/status-message";
import PageHeader from "../components/page-header";
import ArtistImage from "../components/artist-image";
import { useAuth } from "../context/use-auth";
import { getFeed } from "../services/community.service";
import { getArtistUrl } from "../services/artist-link.service";
import {
  getFollowedArtistsForUser,
  getUserConnections,
} from "../services/usuarios.service";

const filters = [
  ["all", "Todo"],
  ["reviews", "Reseñas"],
  ["lists", "Listas"],
];
const emptyPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

function visiblePages(total) {
  return Array.from(
    { length: Math.max(Number(total) || 1, 1) },
    (_, index) => index + 1,
  );
}

export default function Feed() {
  const { usuario } = useAuth();
  const [searchParams] = useSearchParams();
  const initialFilter =
    searchParams.get("tipo") === "resenas"
      ? "reviews"
      : searchParams.get("tipo") === "listas"
        ? "lists"
        : "all";
  const [filter, setFilter] = useState(initialFilter);
  const [audience, setAudience] = useState("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario?._id) return undefined;
    let active = true;
    Promise.all([
      getUserConnections(usuario._id, "following"),
      getFollowedArtistsForUser(usuario._id),
    ])
      .then(([users, artists]) => {
        if (!active) return;
        setFollowedUsers(users);
        setFollowedArtists(artists);
      })
      .catch(() => {
        if (!active) return;
        setFollowedUsers([]);
        setFollowedArtists([]);
      });
    return () => {
      active = false;
    };
  }, [usuario?._id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getFeed(filter, audience, page)
      .then((data) => {
        if (!active) return;
        setItems(data.items || []);
        setPagination(data.pagination || emptyPagination);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filter, audience, page]);

  const pages = useMemo(
    () => visiblePages(pagination.totalPages),
    [pagination.totalPages],
  );
  const usersToShow = followedUsers.slice(0, 6);
  const artistsToShow = followedArtists.slice(0, 6);

  function chooseFilter(nextFilter) {
    setFilter(nextFilter);
    setPage(1);
  }

  function chooseAudience(event) {
    setAudience(event.target.value);
    setPage(1);
  }

  function goToPage(nextPage) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide social-page">
        <PageHeader
          trail={[{ label: "Inicio", to: "/inicio" }, { label: "Comunidad" }]}
          title="Historias que resuenan"
          description="Descubrí reseñas y listas de toda la comunidad."
        />
        <div className="community-layout">
          <section
            className="community-main"
            aria-label="Publicaciones de la comunidad"
          >
            <div className="community-feed-controls">
              <div className="filter-pills" aria-label="Tipo de publicación">
                {filters.map(([id, label]) => (
                  <button
                    key={id}
                    className={filter === id ? "active" : ""}
                    type="button"
                    onClick={() => chooseFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="community-audience-filter">
                <select value={audience} onChange={chooseAudience}>
                  <option value="all">Todos los usuarios</option>
                  <option value="following">Personas que seguís</option>
                </select>
              </label>
            </div>
            <StatusMessage type="error">{error}</StatusMessage>
            {loading ? (
              <p className="loading-text">Cargando actividad…</p>
            ) : (
              <div className="feed-list">
                {items.map((item) =>
                  item.type === "review" ? (
                    <ReviewCard
                      key={`review-${item.data._id}`}
                      review={{ ...item.data, author: item.author }}
                    />
                  ) : (
                    <ListCard
                      key={`list-${item.data._id}`}
                      list={{ ...item.data, author: item.author }}
                      community
                    />
                  ),
                )}
              </div>
            )}
            {!loading && !items.length && (
              <p className="empty-state">
                {audience === "following"
                  ? "Las reseñas y listas de las personas que sigas aparecerán acá."
                  : "Todavía no hay reseñas ni listas públicas."}
              </p>
            )}
            {!loading && pagination.totalPages > 1 && (
              <nav
                className="community-pagination"
                aria-label="Páginas de la comunidad"
              >
                <div className="community-page-numbers">
                  {pages.map((number) => (
                    <button
                      key={number}
                      type="button"
                      className={
                        number === pagination.page
                          ? "active"
                          : ""
                      }
                      aria-label={`Ir a la página ${number}`}
                      aria-current={
                        number === pagination.page
                          ? "page"
                          : undefined
                      }
                      onClick={() => goToPage(number)}
                    >
                      {number}
                    </button>
                  ))}
                </div>

                <button
                  className="community-next-page"
                  type="button"
                  disabled={!pagination.hasNext}
                  aria-label="Ir a la página siguiente"
                  onClick={() => goToPage(page + 1)}
                >
                  <span aria-hidden="true">&gt;</span>
                </button>
              </nav>
            )}
          </section>

          <aside className="community-sidebar" aria-label="Tus conexiones">
            <section className="community-connections">
              <header>
                <div className="community-heading">
                  <h2>Personas que seguís</h2>
                </div>
                {usuario?.handle && (
                  <Link
                    className="community-header-link"
                    to={`/usuario/${usuario.handle}?solapa=usuarios`}
                  >
                    Ver todos
                  </Link>
                )}
              </header>
              {usersToShow.length ? (
                <div className="community-user-list">
                  {usersToShow.map((user) => (
                    <Link key={user._id} to={`/usuario/${user.handle}`}>
                      <Avatar user={user} size={38} />
                      <span>
                        <strong>{user.nombre}</strong>
                        <small>@{user.handle}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>Todavía no seguís personas.</p>
              )}
              {!followedUsers.length && (
                <Link
                  className="community-discover-link"
                  to="/buscar?categoria=usuarios"
                >
                  Descubrir personas
                </Link>
              )}
            </section>

            <section className="community-connections">
              <header>
                <div className="community-heading">
                  <h2>Artistas que seguís</h2>
                </div>
                {usuario?.handle && (
                  <Link
                    className="community-header-link"
                    to={`/usuario/${usuario.handle}?solapa=artistas`}
                  >
                    Ver todos
                  </Link>
                )}
              </header>
              {artistsToShow.length ? (
                <div className="community-user-list community-artist-list">
                  {artistsToShow.map((artist) => (
                    <Link
                      key={artist.catalogId || artist.id}
                      to={getArtistUrl(artist)}
                    >
                      <span className="community-artist-avatar">
                        <ArtistImage artist={artist} />
                      </span>
                      <span>
                        <strong>{artist.name}</strong>
                        <small>Artista</small>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>Todavía no seguís artistas.</p>
              )}
              {!followedArtists.length && (
                <Link
                  className="community-discover-link"
                  to="/buscar?categoria=artistas"
                >
                  Descubrir artistas
                </Link>
              )}
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
