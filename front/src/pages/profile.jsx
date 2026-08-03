import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { useAuth } from "../context/auth-context";
import { getReviews } from "../services/reviews.service";
import { getLists } from "../services/lists.service";
import {
  clearToReviewList,
  getToReviewList,
  TO_REVIEW_EVENT,
} from "../services/to-review.service";
import { searchAlbums } from "../services/lastfm.service";
import { updateCurrentUserProfile } from "../services/usuarios.service";
import { getAlbumUrl } from "../services/album-link.service";



function normalize(value = "") {
  return value.trim().toLowerCase();
}

function isSameRelease(a, b) {
  return (
    normalize(a.album) === normalize(b.album) &&
    normalize(a.artist) === normalize(b.artist)
  );
}

function starsHtml(rating) {
  return [1, 2, 3, 4, 5].map((star) => (
    <span
      className={`star ${star <= Number(rating) ? "filled" : ""}`}
      key={star}
    >
      ★
    </span>
  ));
}

function ReleaseCard({ release }) {
  return (
    <Link to={getAlbumUrl(release)} className="carousel-card release-card">
      <img
        src={release.image || "/images/cover-placeholder.png"}
        alt={release.album}
      />

      <div className="release-card-body">
        <h3>{release.album}</h3>
        <p>{release.artist}</p>
        <span className="release-meta">
          {release.year || "—"} · {release.type || "Álbum"}
        </span>
      </div>
    </Link>
  );
}

function ProfileListCard({ list }) {
  const albums = list.albums || [];
  const covers = albums
    .map((album) => album.image)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <Link className="profile-list-card" to="/lists">
      <div className="list-stack">
        {covers.map((cover, index) => (
          <img key={cover} src={cover} alt="" style={{ "--i": index }} />
        ))}
      </div>

      <h4>{list.title}</h4>
      <p>
        {albums.length} lanzamientos · {list.ownerName || list.owner || "Comunidad"}
      </p>
    </Link>
  );
}

function getProfileFromUsuario(usuario) {
  const nombre = usuario?.nombre || "Usuario";

  return {
    nombre,
    handle: usuario?.handle || nombre.toLowerCase().replaceAll(" ", ""),
    bio: usuario?.bio || "",
    avatar: usuario?.avatar || nombre.slice(0, 1).toUpperCase(),
    avatarImage: usuario?.avatarImage || "",
    top5: usuario?.top5 || [],
    followers: usuario?.followers || 0,
    following: usuario?.following || 0,
  };
}

function Profile() {
  const { usuario, refreshUsuario, updateUsuario } = useAuth();

  const [activeTab, setActiveTab] = useState("top");
  const [profile, setProfile] = useState(() => getProfileFromUsuario(usuario));
  const [profileForm, setProfileForm] = useState(() =>
    getProfileFromUsuario(usuario),
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [top5, setTop5] = useState(usuario?.top5 || []);
  const [top5Query, setTop5Query] = useState("");
  const [top5Results, setTop5Results] = useState([]);
  const [top5Loading, setTop5Loading] = useState(false);
  const [top5Error, setTop5Error] = useState("");

  const [toReview, setToReview] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [profileLists, setProfileLists] = useState([]);
  const [isEditingTop5, setIsEditingTop5] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    refreshUsuario()
      .then((data) => {
        const nextProfile = getProfileFromUsuario(data);

        setProfile(nextProfile);
        setProfileForm(nextProfile);
        setTop5(data.top5 || []);
      })
      .catch(() => {});

    refreshToReview();
    loadReviews();
    loadLists();

    window.addEventListener(TO_REVIEW_EVENT, refreshToReview);
    window.addEventListener("storage", refreshToReview);
    window.addEventListener("focus", refreshToReview);

    return () => {
      window.removeEventListener(TO_REVIEW_EVENT, refreshToReview);
      window.removeEventListener("storage", refreshToReview);
      window.removeEventListener("focus", refreshToReview);
    };
  }, []);

  function refreshToReview() {
    setToReview(getToReviewList());
  }

  async function loadReviews() {
    try {
      const data = await getReviews();
      const currentName = usuario?.nombre || "Usuario";
      const currentId = String(usuario?._id || "");

      const sortedReviews = data
        .filter((review) =>
          review.userId
            ? String(review.userId) === currentId
            : review.username === currentName,
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setUserReviews(sortedReviews);
    } catch {
      setUserReviews([]);
    }
  }

  async function loadLists() {
    try {
      const data = await getLists();
      const currentName = usuario?.nombre || "Usuario";
      const currentId = String(usuario?._id || "");

      const filteredLists = data.filter((list) =>
        list.ownerId
          ? String(list.ownerId) === currentId
          : (list.ownerName || list.owner) === currentName,
      );

      setProfileLists(filteredLists);
    } catch {
      setProfileLists([]);
    }
  }

  function handleProfileChange(e) {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
  }

  function handleProfileImageChange(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setProfileForm({
        ...profileForm,
        avatarImage: reader.result,
      });
    };

    reader.readAsDataURL(file);
  }

  async function saveProfile(nextTop5 = top5) {
    const payload = {
      nombre: profileForm.nombre,
      handle: profileForm.handle,
      bio: profileForm.bio,
      avatar:
        profileForm.avatar ||
        profileForm.nombre?.slice(0, 1).toUpperCase() ||
        "U",
      avatarImage: profileForm.avatarImage || "",
      top5: nextTop5,
    };

    const updatedUser = await updateCurrentUserProfile(payload);

    updateUsuario(updatedUser);

    const nextProfile = getProfileFromUsuario(updatedUser);

    setProfile(nextProfile);
    setProfileForm(nextProfile);
    setTop5(updatedUser.top5 || []);
    setSaveMessage("Perfil actualizado");

    setTimeout(() => {
      setSaveMessage("");
    }, 2200);

    return updatedUser;
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    try {
      await saveProfile(top5);
      setIsEditingProfile(false);
    } catch {
      setSaveMessage("No se pudo guardar el perfil");
    }
  }

  function handleCancelProfileEdit() {
    setProfileForm(profile);
    setIsEditingProfile(false);
  }

  function handleClearToReview() {
    clearToReviewList();
    setToReview([]);
  }

  async function handleTop5Search(e) {
    e.preventDefault();

    if (!top5Query.trim()) return;

    setTop5Loading(true);
    setTop5Error("");

    try {
      const data = await searchAlbums(top5Query);

      const formattedResults = data
        .filter((album) => album.title && album.artist)
        .map((album) => ({
          album: album.title,
          artist: album.artist,
          image: album.image || "/images/cover-placeholder.png",
          year: "",
          type: "Álbum",
        }));

      setTop5Results(formattedResults);
    } catch {
      setTop5Results([]);
      setTop5Error("No se pudieron cargar resultados.");
    } finally {
      setTop5Loading(false);
    }
  }

  async function toggleTop5Release(release) {
    const alreadySelected = top5.some((item) => isSameRelease(item, release));

    let nextTop5;

    if (alreadySelected) {
      nextTop5 = top5.filter((item) => !isSameRelease(item, release));
    } else {
      if (top5.length >= 5) {
        setTop5Error("Solo podés elegir hasta 5 discos.");
        return;
      }

      nextTop5 = [...top5, release];
    }

    setTop5(nextTop5);
    setTop5Error("");

    try {
      await saveProfile(nextTop5);
    } catch {
      setTop5Error("No se pudo guardar el Top 5.");
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide" id="profileRoot">
        <header className="profile-header">
          <div className="profile-avatar">
            {profile.avatarImage ? (
              <img
                className="avatar-image"
                src={profile.avatarImage}
                alt={profile.nombre}
                width="132"
                height="132"
                style={{
                  width: "132px",
                  height: "132px",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            ) : (
              profile.avatar
            )}
          </div>

          <div className="profile-main-info">
            {!isEditingProfile ? (
              <>
                <div className="profile-title-row">
                  <div>
                    <h1 className="profile-name">{profile.nombre}</h1>
                    <p className="profile-handle">@{profile.handle}</p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Editar perfil
                  </button>
                </div>

                <p className="profile-bio">
                  {profile.bio || "Todavía no escribiste una biografía."}
                </p>

                <div className="profile-stats">
                  <div>
                    <strong>{profile.followers}</strong> seguidores
                  </div>
                  <div>
                    <strong>{profile.following}</strong> seguidos
                  </div>
                </div>
              </>
            ) : (
              <form className="profile-edit-form" onSubmit={handleSaveProfile}>
                <div className="profile-edit-grid">
                  <div className="field-group">
                    <label className="field-label">Nombre</label>
                    <input
                      name="nombre"
                      value={profileForm.nombre}
                      onChange={handleProfileChange}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Usuario</label>
                    <input
                      name="handle"
                      value={profileForm.handle}
                      onChange={handleProfileChange}
                      placeholder="usuario"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Inicial</label>
                    <input
                      name="avatar"
                      maxLength="2"
                      value={profileForm.avatar}
                      onChange={handleProfileChange}
                      placeholder="D"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Foto de perfil</label>

                  <div className="profile-photo-edit">
                    <div className="profile-photo-preview">
                      {profileForm.avatarImage ? (
                        <img
                          className="avatar-image"
                          src={profileForm.avatarImage}
                          alt="Vista previa"
                          width="64"
                          height="64"
                          style={{
                            width: "64px",
                            height: "64px",
                            objectFit: "cover",
                            borderRadius: "50%",
                            display: "block",
                          }}
                        />
                      ) : (
                        profileForm.avatar
                      )}
                    </div>

                    <label className="btn btn-secondary btn-sm profile-photo-button">
                      Subir foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                      />
                    </label>

                    {profileForm.avatarImage && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          setProfileForm({
                            ...profileForm,
                            avatarImage: "",
                          })
                        }
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Biografía</label>
                  <textarea
                    name="bio"
                    rows="4"
                    value={profileForm.bio}
                    onChange={handleProfileChange}
                    placeholder="Contá algo sobre tu vínculo con la música"
                  />
                </div>

                <div className="profile-edit-actions">
                  <button type="submit" className="btn btn-primary">
                    Guardar cambios
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelProfileEdit}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {saveMessage && <p className="field-hint">{saveMessage}</p>}
          </div>
        </header>

        <div className="profile-tabs">
          <button
            type="button"
            className={activeTab === "top" ? "active" : ""}
            onClick={() => setActiveTab("top")}
          >
            Top 5
          </button>

          <button
            type="button"
            className={activeTab === "toreview" ? "active" : ""}
            onClick={() => setActiveTab("toreview")}
          >
            Por reseñar
          </button>

          <button
            type="button"
            className={activeTab === "reviews" ? "active" : ""}
            onClick={() => setActiveTab("reviews")}
          >
            Reseñas
          </button>

          <button
            type="button"
            className={activeTab === "lists" ? "active" : ""}
            onClick={() => setActiveTab("lists")}
          >
            Listas
          </button>
        </div>

        <div className={`tab-panel ${activeTab === "top" ? "active" : ""}`}>
          <div className="top-five-header">
            <h2 className="section-heading">Top 5</h2>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditingTop5(!isEditingTop5)}
            >
              {isEditingTop5 ? "Cerrar edición" : "Editar Top 5"}
            </button>
          </div>

          {top5.length > 0 ? (
            <div className="top-five-row">
              {top5.map((release) => (
                <Link
                  className="top-five-item"
                  to={getAlbumUrl(release)}
                  key={`${release.artist}-${release.album}`}
                >
                  <img
                    src={release.image || "/images/cover-placeholder.png"}
                    alt={release.album}
                  />
                  <h4>{release.album}</h4>
                  <p>{release.artist}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state-block top5-empty">
              <p className="empty-state">
                Todavía no elegiste tus discos de cabecera.
              </p>
            </div>
          )}

          {isEditingTop5 && (
            <div className="top5-search-panel">
              <form className="top5-search-row" onSubmit={handleTop5Search}>
                <input
                  type="search"
                  value={top5Query}
                  onChange={(e) => setTop5Query(e.target.value)}
                  placeholder="Buscar álbum o artista en Last.fm"
                />

                <button type="submit" className="btn btn-primary">
                  Buscar
                </button>
              </form>

              <p className="field-hint">
                Elegí hasta 5 discos. Los seleccionados se guardan en tu usuario.
              </p>

              {top5Error && <p className="form-error">{top5Error}</p>}

              {top5Loading ? (
                <p className="loading-text">Buscando álbumes…</p>
              ) : (
                <div className="top5-results-grid">
                  {top5Results.map((release) => {
                    const selectedIndex = top5.findIndex((item) =>
                      isSameRelease(item, release),
                    );

                    return (
                      <button
                        type="button"
                        className={`top5-result-card ${
                          selectedIndex >= 0 ? "active" : ""
                        }`}
                        key={`${release.artist}-${release.album}`}
                        onClick={() => toggleTop5Release(release)}
                      >
                        <img
                          src={release.image || "/images/cover-placeholder.png"}
                          alt={release.album}
                        />

                        <span>{release.album}</span>
                        <small>{release.artist}</small>

                        {selectedIndex >= 0 && (
                          <strong>{selectedIndex + 1}</strong>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`tab-panel ${activeTab === "toreview" ? "active" : ""}`}
        >
          <div className="top-five-header">
            <h2 className="section-heading">Por reseñar</h2>

            {toReview.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearToReview}
              >
                Limpiar por reseñar
              </button>
            )}
          </div>

          {toReview.length > 0 ? (
            <div className="carousel">
              <div className="carousel-track">
                {toReview.map((release) => (
                  <ReleaseCard
                    key={`${release.artist}-${release.album}`}
                    release={release}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state-block">
              <p className="empty-state">
                Todavía no guardaste lanzamientos para reseñar.
              </p>

              <Link className="btn btn-primary" to="/search">
                Buscar música
              </Link>
            </div>
          )}
        </div>

        <div className={`tab-panel ${activeTab === "reviews" ? "active" : ""}`}>
          <div id="userReviews">
            {userReviews.length === 0 ? (
              <p className="empty-state">Todavía no publicaste reseñas.</p>
            ) : (
              userReviews.map((review) => (
                <article className="profile-review-card-wrap" key={review._id}>
                  <Link
                    className="profile-review-card"
                    to={`/review/${review._id}`}
                  >
                    <div>
                      <h3>{review.album}</h3>
                      <p className="artist">{review.artist}</p>

                      {review.rating ? (
                        <div className="stars">{starsHtml(review.rating)}</div>
                      ) : null}

                      <p className="preview">
                        {review.text.slice(0, 140)}
                        {review.text.length > 140 ? "…" : ""}
                      </p>

                      <span className="read-more">…leer más</span>
                    </div>

                    <img
                      className="profile-review-cover"
                      src={review.image || "/images/cover-placeholder.png"}
                      alt={review.album}
                    />
                  </Link>
                </article>
              ))
            )}
          </div>
        </div>

        <div className={`tab-panel ${activeTab === "lists" ? "active" : ""}`}>
          {profileLists.length > 0 ? (
            <div className="profile-list-grid">
              {profileLists.map((list) => (
                <ProfileListCard key={list._id} list={list} />
              ))}
            </div>
          ) : (
            <div className="empty-state-block">
              <p className="empty-state">Todavía no creaste listas.</p>

              <Link className="btn btn-primary" to="/lists">
                Crear una lista
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Profile;
