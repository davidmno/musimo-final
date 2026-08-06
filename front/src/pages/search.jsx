import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import PageHeader from "../components/page-header";
import { ListCard, ReleaseCard } from "../components/content-cards";
import StatusMessage from "../components/status-message";
import { searchCatalog } from "../services/catalog.service";
import { searchCommunity } from "../services/community.service";
import {
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from "../services/recent-searches.service";
import { getArtistUrl } from "../services/artist-link.service";
import { getAlbumUrl } from "../services/album-link.service";
import AppIcon from "../components/app-icon";
import ArtistImage from "../components/artist-image";
import { followUser, unfollowUser } from "../services/usuarios.service";

const categories = [
  ["todo", "Todo"],
  ["lanzamientos", "Lanzamientos"],
  ["artistas", "Artistas"],
  ["usuarios", "Usuarios"],
  ["listas", "Listas"],
];

const categoryAliases = {
  all: "todo",
  releases: "lanzamientos",
  artists: "artistas",
  people: "usuarios",
  lists: "listas",
};


function ArtistResult({ artist }) {
  const [resolvedImage, setResolvedImage] = useState("");

  return (
    <Link
      className="person-result artist-result"
      to={getArtistUrl(artist)}
      onClick={() =>
        saveRecentSearch({
          ...artist,
          image: resolvedImage,
          type: "artist",
          title: artist.name,
          subtitle: "Artista",
        })
      }
    >
      <span className="artist-avatar">
        <ArtistImage artist={artist} onResolve={setResolvedImage} />
      </span>

      <span className="artist-result-copy">
        <strong>{artist.name}</strong>
      </span>

      <AppIcon
        name="chevron-right"
        size={18}
        className="card-enter-icon"
      />
    </Link>
  );
}

function PersonResult({ person, onFollow, busy }) {
  return (
    <article className="person-result person-result-user">
      <Link to={`/usuario/${person.handle}`} onClick={() => saveRecentSearch({ ...person, type: "person", title: person.nombre, subtitle: `@${person.handle}` })}>
        <span className="artist-avatar">{person.avatarImage ? <img src={person.avatarImage} alt="" /> : person.avatar || person.nombre?.[0]}</span>
        <span><strong>{person.nombre}</strong><small>@{person.handle}</small><p>{person.bio}</p></span>
      </Link>
      <button className={`btn btn-sm ${person.isFollowing ? "btn-secondary" : "btn-primary"}`} type="button" onClick={() => onFollow(person)} disabled={busy}>{busy ? "…" : person.isFollowing ? "Siguiendo" : "Seguir"}</button>
    </article>
  );
}

function RecentItem({ item, remove }) {
  let to = "/buscar";
  if (item.type === "release") to = getAlbumUrl(item);
  if (item.type === "artist")
    to = getArtistUrl({ id: item.catalogId, name: item.title });
  if (item.type === "person") to = `/usuario/${item.handle}`;
  if (item.type === "list") to = `/lista/${item.id}`;
  const round = item.type === "artist" || item.type === "person";
  const image = item.image || item.avatarImage;
  const usableImage = image && !image.includes("cover-placeholder");
  const recentArtist = {
    id: item.catalogId || item.id,
    catalogId: item.catalogId || item.id,
    name: item.title,
  };

  return (
    <article className="recent-item">
      <Link to={to}>
        <span className={`recent-thumb ${round ? "round" : ""}`}>
          {item.type === "artist" ? (
            <ArtistImage artist={recentArtist} />
          ) : usableImage ? (
            <img src={image} alt="" />
          ) : (
            <span aria-hidden="true">
              {round ? item.title?.slice(0, 1) : "m"}
            </span>
          )}
        </span>
        <span>
          <strong>{item.title}</strong>
          <small>{item.subtitle}</small>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => remove(item)}
        aria-label={`Quitar ${item.title}`}
      >
        <AppIcon name="x" size={16} />
      </button>
    </article>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(
    params.get("consulta") || params.get("q") || "",
  );
  const [category, setCategory] = useState(
    categoryAliases[params.get("category")] ||
      params.get("categoria") ||
      "todo",
  );
  const [catalog, setCatalog] = useState({ releases: [], artists: [] });
  const [community, setCommunity] = useState({ people: [], lists: [] });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const immediateSearch = useRef(false);
  const [searchRequest, setSearchRequest] = useState(0);
  const [followingBusy, setFollowingBusy] = useState("");

  async function togglePerson(person) {
    setFollowingBusy(person._id);
    try {
      if (person.isFollowing) await unfollowUser(person._id);
      else await followUser(person._id);
      setCommunity((current) => ({ ...current, people: current.people.map((item) => item._id === person._id ? { ...item, isFollowing: !item.isFollowing } : item) }));
    } catch (followError) {
      setError(followError.message || "No se pudo actualizar el seguimiento.");
    } finally {
      setFollowingBusy("");
    }
  }

  useEffect(() => {
    getRecentSearches().then((items) =>
      setRecent(items.filter((item) => item.type !== "review")),
    );
  }, []);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) return undefined;
    const controller = new AbortController();
    const delay = immediateSearch.current ? 0 : 450;
    immediateSearch.current = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const [catalogData, communityData] = await Promise.all([
          searchCatalog(clean, { limit: 14, releaseLimit: 36, expandArtist: true, signal: controller.signal }),
          searchCommunity(clean, 14),
        ]);
        setCatalog(catalogData);
        setCommunity(communityData);
        setParams(
          {
            consulta: clean,
            ...(category !== "todo" ? { categoria: category } : {}),
          },
          { replace: true },
        );
      } catch (loadError) {
        if (loadError.name !== "AbortError")
          setError(loadError.message || "No se pudo completar la búsqueda.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, setParams, searchRequest]);

  const resultCount = useMemo(
    () =>
      catalog.releases.length +
      catalog.artists.length +
      community.people.length +
      community.lists.length,
    [catalog, community],
  );
  const show = (value) => category === "todo" || category === value;

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide catalog-search-page">
        <PageHeader
          trail={[{ label: "Inicio", to: "/inicio" }, { label: "Descubrir" }]}
          title="El universo de musimo"
          description="Buscá lanzamientos, artistas, listas y usuarios."
          className="search-page-title"
        />
        <div className="search-layout">
          <div className="search-main-column">
        <section className="search-page-header" aria-label="Búsqueda">
          <div className="search-box search-box--large">
            <AppIcon name="search" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim().length >= 2) {
                  event.preventDefault();
                  immediateSearch.current = true;
                  setSearchRequest((value) => value + 1);
                }
              }}
              placeholder="Buscar álbumes, artistas, listas o usuarios."
            />
            {query && (
              <button
                className="search-clear"
                type="button"
                onClick={() => {
                  setQuery("");
                  setCatalog({ releases: [], artists: [] });
                  setCommunity({ people: [], lists: [] });
                  setParams({}, { replace: true });
                }}
                aria-label="Limpiar búsqueda"
              >
                <AppIcon name="x" size={16} />
              </button>
            )}
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                immediateSearch.current = true;
                setSearchRequest((value) => value + 1);
              }}
              disabled={query.trim().length < 2 || loading}
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>
          </div>
          <div className="filter-pills">
              {categories.map(([id, label]) => (
                <button
                  type="button"
                  className={category === id ? "active" : ""}
                  key={id}
                  onClick={() => setCategory(id)}
                >
                  {label}
                </button>
              ))}
          </div>
        </section>
        {query.trim().length < 2 ? (
          <section className="search-recent-section search-recent-mobile">
            <div className="section-header">
              <h2>Búsquedas recientes</h2>
              {recent.length > 0 && (
                <button
                  className="text-button"
                  type="button"
                  onClick={async () => setRecent(await clearRecentSearches())}
                >
                  Borrar todo
                </button>
              )}
            </div>
            <div className="recent-grid">
              {recent.slice(0, 10).map((item) => (
                <RecentItem
                  key={`${item.type}-${item.id}`}
                  item={item}
                  remove={async (target) =>
                    setRecent(await removeRecentSearch(target))
                  }
                />
              ))}
            </div>
            {!recent.length && (
              <p className="empty-state">
                Lo que abras aparecerá acá para volver rápido.
              </p>
            )}
          </section>
        ) : (
          <div className="search-results" aria-live="polite">
<StatusMessage type="error">{error}</StatusMessage>
            {!loading && !error && resultCount === 0 && (
              <p className="empty-state">
                No encontramos resultados para “{query.trim()}”.
              </p>
            )}
            {show("lanzamientos") && catalog.releases.length > 0 && (
              <section>
                <h2>Lanzamientos</h2>
                <div className="result-grid">
                  {catalog.releases.map((release) => (
                    <div
                      key={release.catalogId}
                      onClick={() =>
                        saveRecentSearch({
                          ...release,
                          type: "release",
                          subtitle: release.artist,
                        })
                      }
                    >
                      <ReleaseCard release={release} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {show("artistas") && catalog.artists.length > 0 && (
              <section>
                <h2>Artistas</h2>
                <div className="people-grid">
                  {catalog.artists.map((artist) => (
                    <ArtistResult key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}
            {show("usuarios") && community.people.length > 0 && (
              <section>
                <h2>Usuarios</h2>
                <div className="people-grid">
                  {community.people.map((person) => (
                    <PersonResult key={person._id} person={person} onFollow={togglePerson} busy={followingBusy === person._id} />
                  ))}
                </div>
              </section>
            )}
            {show("listas") && community.lists.length > 0 && (
              <section>
                <h2>Listas</h2>
                <div className="result-grid">
                  {community.lists.map((list) => (
                    <ListCard key={list._id} list={list} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
          </div>

          <aside
            className="community-sidebar search-recent-sidebar"
            aria-label="Búsquedas recientes"
          >
            <section className="community-connections search-recent-panel">
              <header>
                <h2>Búsquedas recientes</h2>

                {recent.length > 0 && (
                  <button
                    className="community-header-link"
                    type="button"
                    onClick={async () =>
                      setRecent(await clearRecentSearches())
                    }
                  >
                    Borrar todo
                  </button>
                )}
              </header>

              <div className="recent-grid">
                {recent.slice(0, 10).map((item) => (
                  <RecentItem
                    key={`sidebar-${item.type}-${item.id}`}
                    item={item}
                    remove={async (target) =>
                      setRecent(await removeRecentSearch(target))
                    }
                  />
                ))}
              </div>

              {!recent.length && (
                <p>
                  Lo que abras aparecerá acá para volver rápido.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
