import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { searchAlbums } from "../services/lastfm.service";
import { getReleaseMetadata } from "../services/release-metadata.service";
import { getAlbumUrl } from "../services/album-link.service";

const releaseFilters = ["Todos", "Álbum", "EP", "Sencillo"];
const SEARCH_STATE_KEY = "musimo_search_state";

function getSavedSearchState() {
  const saved = sessionStorage.getItem(SEARCH_STATE_KEY);

  if (!saved) {
    return {
      query: "",
      albums: [],
      activeFilter: "Todos",
      searched: false,
    };
  }

  try {
    return JSON.parse(saved);
  } catch {
    return {
      query: "",
      albums: [],
      activeFilter: "Todos",
      searched: false,
    };
  }
}

function saveSearchState(nextState) {
  sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(nextState));
}

function Search() {
  const savedSearch = getSavedSearchState();

  const [query, setQuery] = useState(savedSearch.query);
  const [albums, setAlbums] = useState(savedSearch.albums);
  const [activeFilter, setActiveFilter] = useState(savedSearch.activeFilter);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(savedSearch.searched);

  const filteredAlbums = useMemo(() => {
    if (activeFilter === "Todos") return albums;

    return albums.filter((album) => album.releaseType === activeFilter);
  }, [albums, activeFilter]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setActiveFilter("Todos");

    try {
      const data = await searchAlbums(query);

      const enrichedAlbums = await Promise.all(
        data.map(async (album) => {
          const metadata = await getReleaseMetadata(album.title, album.artist);

          return {
            ...album,
            releaseType: metadata.releaseType || "Álbum",
            year: metadata.year || "",
          };
        }),
      );

      setAlbums(enrichedAlbums);

      saveSearchState({
        query,
        albums: enrichedAlbums,
        activeFilter: "Todos",
        searched: true,
      });
    } catch {
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide">
        <section className="search-hero">
          <h1 className="page-title">Buscar lanzamientos</h1>

          <p className="home-lead">
            Elegí un álbum, EP o sencillo para guardar, consultar o convertir en
            una reseña dentro de tu bitácora musical.
          </p>

          <form className="search-row search-row-large" onSubmit={handleSubmit}>
            <div className="search-wrapper">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                placeholder="Buscá un álbum, artista o lanzamiento..."
              />
            </div>

            <button className="btn btn-primary" type="submit">
              Buscar
            </button>
          </form>

          {albums.length > 0 && (
            <div className="release-filter-row">
              {releaseFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`release-filter ${
                    activeFilter === filter ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveFilter(filter);

                    saveSearchState({
                      query,
                      albums,
                      activeFilter: filter,
                      searched,
                    });
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <p className="search-info">
              Buscando en Last.fm y clasificando lanzamientos…
            </p>
          )}

          {!loading && searched && albums.length === 0 && (
            <p className="search-info">
              No encontramos resultados para esa búsqueda.
            </p>
          )}

          {!loading &&
            searched &&
            albums.length > 0 &&
            filteredAlbums.length === 0 && (
              <p className="search-info">
                No hay resultados para el filtro seleccionado.
              </p>
            )}
        </section>

        <section className="search-grid">
          {filteredAlbums.map((album) => (
            <Link
              className="search-card"
              key={`${album.artist}-${album.title}`}
              to={getAlbumUrl(album)}
            >
              <img
                src={album.image || "/images/cover-placeholder.png"}
                alt={album.title}
              />

              <div className="search-card-body">
                <h3>{album.title}</h3>
                <p className="search-card-artist">{album.artist}</p>

                <p className="search-card-meta">
                  {album.releaseType || "Álbum"}
                  {album.year ? ` · ${album.year}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Search;
