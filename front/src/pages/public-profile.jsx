import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { Avatar, ListCard, ReleaseCard, ReviewCard, fallbackCover } from "../components/content-cards";
import StatusMessage from "../components/status-message";
import ConfirmDialog from "../components/confirm-dialog";
import { PageTrail } from "../components/page-header";
import { useAuth } from "../context/use-auth";
import { searchCatalog } from "../services/catalog.service";
import { setBreadcrumbContext } from "../services/breadcrumb.service";
import { getArtistUrl } from "../services/artist-link.service";
import { clearToReviewList, getToReviewList, removeFromToReview } from "../services/to-review.service";
import AppIcon from "../components/app-icon";
import ArtistImage from "../components/artist-image";
import {
  changePassword,
  followUser,
  getCurrentUser,
  getFollowedArtistsForUser,
  getPublicProfile,
  getUserConnections,
  unfollowUser,
  updateCurrentUserProfile,
} from "../services/usuarios.service";

const SHOW_HEADER_ALBUMS = false;

function accountData(user, top5 = user.top5 || []) {
  return {
    nombre: user.nombre || "",
    handle: user.handle || "",
    email: user.email || "",
    bio: user.bio || "",
    avatar: user.avatar || user.nombre?.slice(0, 1) || "U",
    avatarImage: user.avatarImage || "",
    favoriteArtists: user.favoriteArtists || [],
    top5,
    hasPassword: user.hasPassword,
  };
}

export default function PublicProfile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [profileParams] = useSearchParams();
  const requestedTab = profileParams.get("solapa");
  const { usuario, updateUsuario } = useAuth();
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editingTop5, setEditingTop5] = useState(false);
  const [query, setQuery] = useState("");
  const [releaseResults, setReleaseResults] = useState([]);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", repeat: "" });
  const [connections, setConnections] = useState({ type: "following", items: [], loading: false, loaded: false });
  const [connectionBusy, setConnectionBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => { if (profile) setBreadcrumbContext({ profile }); }, [profile]);

  useEffect(() => {
    setTab(
      requestedTab === "artistas"
        ? "artists"
        : requestedTab === "usuarios"
          ? "users"
          : "profile",
    );
    setConnections({
      type: "following",
      items: [],
      loading: false,
      loaded: false,
    });
  }, [handle, requestedTab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPublicProfile(handle)
      .then(async (data) => {
        const artistsPromise = getFollowedArtistsForUser(data._id).catch(() => []);
        if (data.isMe) {
          const [current, savedItems, artists] = await Promise.all([getCurrentUser(), getToReviewList(), artistsPromise]);
          if (!active) return;
          setAccount(accountData(current));
          setSaved(savedItems);
          setFollowedArtists(artists);
          setProfile({ ...data, ...current, reviews: data.reviews, lists: data.lists, isMe: true });
        } else {
          const artists = await artistsPromise;
          if (!active) return;
          setProfile(data);
          setFollowedArtists(artists);
          setAccount(null);
        }
      })
      .catch((error) => active && setStatus({ type: "error", text: error.message }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [handle]);

  useEffect(() => {
    if (
      !profile?._id ||
      tab !== "users" ||
      connections.loading ||
      connections.loaded
    ) {
      return undefined;
    }

    let active = true;

    setConnections({
      type: "following",
      items: [],
      loading: true,
      loaded: false,
    });

    Promise.all([
      getUserConnections(profile._id, "following"),
      usuario?._id
        ? getUserConnections(usuario._id, "following").catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([items, viewerFollowing]) => {
        if (!active) return;

        const followingIds = new Set(
          viewerFollowing.map((person) => String(person._id)),
        );

        setConnections({
          type: "following",
          items: items.map((person) => ({
            ...person,
            isFollowing: followingIds.has(String(person._id)),
          })),
          loading: false,
          loaded: true,
        });
      })
      .catch((error) => {
        if (!active) return;

        setConnections({
          type: "following",
          items: [],
          loading: false,
          loaded: true,
        });

        setStatus({
          type: "error",
          text: error.message,
        });
      });

    return () => {
      active = false;
    };
  }, [
    profile?._id,
    tab,
    connections.loading,
    connections.loaded,
    usuario?._id,
  ]);

  async function follow() {
    try {
      if (profile.isFollowing) await unfollowUser(profile._id);
      else await followUser(profile._id);
      setProfile((current) => ({ ...current, isFollowing: !current.isFollowing, followers: current.followers + (current.isFollowing ? -1 : 1) }));
    } catch (error) { setStatus({ type: "error", text: error.message }); }
  }
function image(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus({
      type: "error",
      text: "Elegí un archivo de imagen válido.",
    });

    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onerror = () => {
    setStatus({
      type: "error",
      text: "No pudimos leer la imagen seleccionada.",
    });
  };

  reader.onload = () => {
    const preview = new Image();

    preview.onerror = () => {
      setStatus({
        type: "error",
        text: "No pudimos procesar la imagen seleccionada.",
      });
    };

    preview.onload = () => {
      const outputSize = 512;

      /*
       * Recorte cuadrado centrado:
       * toma el lado más corto de la foto.
       */
      const cropSize = Math.min(
        preview.naturalWidth,
        preview.naturalHeight,
      );

      const sourceX = Math.max(
        0,
        (preview.naturalWidth - cropSize) / 2,
      );

      const sourceY = Math.max(
        0,
        (preview.naturalHeight - cropSize) / 2,
      );

      const canvas = document.createElement("canvas");

      canvas.width = outputSize;
      canvas.height = outputSize;

      const context = canvas.getContext("2d");

      if (!context) {
        setStatus({
          type: "error",
          text: "No pudimos procesar la imagen.",
        });

        return;
      }

      context.drawImage(
        preview,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        outputSize,
        outputSize,
      );

      const avatarImage = canvas.toDataURL(
        "image/jpeg",
        0.82,
      );

      setAccount((current) => ({
        ...current,
        avatarImage,
      }));

      event.target.value = "";
    };

    preview.src = reader.result;
  };

  reader.readAsDataURL(file);
}

  function cancelAccountEditing() {
    setAccount(accountData(profile));
    setPassword({
      currentPassword: "",
      newPassword: "",
      repeat: "",
    });
    setEditing(false);
  }

  async function saveAccount(event) {
    event.preventDefault();
    if (password.newPassword && password.newPassword !== password.repeat) {
      return setStatus({ type: "error", text: "Las contraseñas nuevas no coinciden." });
    }
    setBusy(true);
    try {
      const updated = await updateCurrentUserProfile(account);
      if (password.newPassword) {
        await changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      }
      updateUsuario(updated);
      setAccount(accountData(updated));
      setProfile((current) => ({ ...current, ...updated, reviews: current.reviews, lists: current.lists, isMe: true }));
      setPassword({ currentPassword: "", newPassword: "", repeat: "" });
      setEditing(false);
      setStatus({ type: "success", text: "Cuenta actualizada." });
      if (updated.handle !== handle) navigate(`/usuario/${updated.handle}`, { replace: true });
    } catch (error) { setStatus({ type: "error", text: error.message || "No se pudo actualizar la cuenta." }); }
    finally { setBusy(false); }
  }

  async function searchReleases(event) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    try { setReleaseResults((await searchCatalog(query, { limit: 12 })).releases); }
    catch (error) { setStatus({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }

  async function persistTop5(nextTop5) {
    const next = { ...account, top5: nextTop5 };
    setAccount(next);
    setBusy(true);
    try {
      const updated = await updateCurrentUserProfile(next);
      updateUsuario(updated);
      setAccount(accountData(updated));
      setProfile((current) => ({ ...current, top5: updated.top5 }));
      setStatus({ type: "success", text: "Discos de cabecera actualizados." });
    } catch (error) { setStatus({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }

  function addTop5(release) {
    const current = account.top5 || [];
    if (current.some((item) => item.catalogId === release.catalogId)) return;
    if (current.length >= 5) return setStatus({ type: "error", text: "Podés elegir hasta cinco discos." });
    persistTop5([...current, release]);
  }

  async function openConnections(type) {
    setTab("users");
    setConnections({ type, items: [], loading: true, loaded: false });
    try {
      const [items, viewerFollowing] = await Promise.all([
        getUserConnections(profile._id, type),
        usuario?._id ? getUserConnections(usuario._id, "following").catch(() => []) : Promise.resolve([]),
      ]);
      const followingIds = new Set(viewerFollowing.map((person) => String(person._id)));
      setConnections({
        type,
        items: items.map((person) => ({ ...person, isFollowing: followingIds.has(String(person._id)) })),
        loading: false,
        loaded: true,
      });
    } catch (error) {
      setConnections({ type, items: [], loading: false, loaded: true });
      setStatus({ type: "error", text: error.message });
    }
  }

  async function toggleConnection(person) {
    setConnectionBusy(person._id);
    try {
      if (person.isFollowing) await unfollowUser(person._id);
      else await followUser(person._id);
      setConnections((current) => ({
        ...current,
        items: profile.isMe && current.type === "following" && person.isFollowing
          ? current.items.filter((item) => item._id !== person._id)
          : current.items.map((item) => item._id === person._id ? { ...item, isFollowing: !item.isFollowing } : item),
      }));
      if (profile.isMe && connections.type === "following" && person.isFollowing) {
        setProfile((current) => ({ ...current, following: Math.max(0, current.following - 1) }));
      }
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setConnectionBusy("");
    }
  }

  async function removeSaved(release) {
    try { setSaved(await removeFromToReview(release)); }
    catch (error) { setStatus({ type: "error", text: error.message }); }
  }

  async function clearSaved() {
    try { await clearToReviewList(); setSaved([]); setConfirmClear(false); }
    catch (error) { setStatus({ type: "error", text: error.message }); }
  }

  return <div className="app-body"><Navbar /><main className="app-page app-page-wide public-profile-page">
    {loading && <p className="loading-text">Cargando perfil…</p>}
    <StatusMessage type={status.type}>{status.text}</StatusMessage>
    {profile && <>
      <header className={`profile-header-new public-profile-header ${profile.isMe ? "is-own-profile" : ""}`}>
        <div className="profile-photo-wrap"><span className="profile-photo">{profile.avatarImage ? <img src={profile.avatarImage} alt={profile.nombre} /> : profile.avatar}</span>{profile.isMe && <button className="profile-photo-edit" type="button" onClick={() => setEditing(true)} aria-label="Editar perfil" title="Editar perfil"><AppIcon name="pencil" size={16} /></button>}</div>
        <div className="public-profile-identity page-heading-copy"><PageTrail items={[{ label: "Inicio", to: "/inicio" }, { label: "Perfil" }]} /><div className="profile-title-line"><div><h1>{profile.nombre}</h1><p>@{profile.handle}</p></div><div>{profile.isMe ? <button className="btn btn-secondary" type="button" onClick={() => setEditing(true)}>Editar perfil</button> : <button className="btn btn-primary" type="button" onClick={follow}>{profile.isFollowing ? "Siguiendo" : "Seguir"}</button>}</div></div>{profile.bio?.trim() && <p>{profile.bio}</p>}</div>
        <div className="public-profile-counts"><button type="button" onClick={() => openConnections("following")}><strong>{profile.following}</strong><span>seguidos</span></button><button type="button" onClick={() => openConnections("followers")}><strong>{profile.followers}</strong><span>seguidores</span></button></div>
      </header>

      <nav className="profile-tabs public-profile-tabs" aria-label="Contenido del perfil">
        <button type="button" className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Perfil</button>
        {profile.isMe && <button type="button" className={tab === "saved" ? "active" : ""} onClick={() => setTab("saved")}>Por reseñar <span>{saved.length}</span></button>}
        <button type="button" className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>Reseñas <span>{profile.reviews.length}</span></button>
        <button type="button" className={tab === "lists" ? "active" : ""} onClick={() => setTab("lists")}>Listas <span>{profile.lists.length}</span></button>
        <button type="button" className={tab === "users" ? "active" : ""} onClick={() => openConnections(connections.type)}>Usuarios <span>{profile.following + profile.followers}</span></button>
        <button type="button" className={tab === "artists" ? "active" : ""} onClick={() => setTab("artists")}>Artistas <span>{followedArtists.length}</span></button>
      </nav>

      {tab === "profile" && <div className="public-profile-overview">
        {SHOW_HEADER_ALBUMS && <section><div className="section-header"><div><h2>Discos de cabecera</h2>{profile.isMe && <p className="section-description">Hasta cinco discos que te representan.</p>}</div>{profile.isMe && <button className="text-button" type="button" onClick={() => setEditingTop5((value) => !value)}>{editingTop5 ? "Cerrar" : "Editar"}</button>}</div>
          {profile.top5?.length ? <div className="result-grid profile-top-five">{profile.top5.map((release, index) => <article key={release.catalogId || release.album}><ReleaseCard release={release} />{profile.isMe && editingTop5 && <button className="profile-card-remove" type="button" aria-label={`Quitar ${release.album}`} onClick={() => persistTop5(account.top5.filter((_, position) => position !== index))}><AppIcon name="x" size={16} /></button>}<span className="profile-rank">{index + 1}</span></article>)}</div> : <p className="empty-state">{profile.isMe ? "Todavía no elegiste discos de cabecera." : "Todavía no eligió discos de cabecera."}</p>}
          {profile.isMe && editingTop5 && <form className="profile-release-picker" onSubmit={searchReleases}><div className="search-box"><AppIcon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar álbum o sencillo" autoFocus />{query && <button className="search-clear" type="button" onClick={() => { setQuery(""); setReleaseResults([]); }} aria-label="Limpiar búsqueda"><AppIcon name="x" size={16} /></button>}<button className="btn btn-primary" type="submit" disabled={busy}>Buscar</button></div><div className="profile-picker-grid">{releaseResults.map((release) => <button type="button" key={release.catalogId} onClick={() => addTop5(release)}><img src={release.image || "/images/cover-placeholder.png"} alt="" onError={fallbackCover} /><span><strong>{release.album}</strong><small>{release.artist}</small></span></button>)}</div>{query && !releaseResults.length && !busy && <p className="empty-state">No encontramos lanzamientos.</p>}</form>}
        </section>}
        <aside
          className="community-sidebar profile-followed-artists"
          aria-label={
            profile.isMe
              ? "Artistas que seguís"
              : `Artistas que sigue ${profile.nombre}`
          }
        >
          <section className="community-connections profile-followed-artists-panel">
            <header>
              <h2>
                {profile.isMe
                  ? "Artistas que seguís"
                  : `Artistas que sigue ${profile.nombre}`}
              </h2>

              {followedArtists.length > 0 && (
                <Link
                  className="community-header-link"
                  to={`/usuario/${profile.handle}?solapa=artistas`}
                >
                  Ver todos
                </Link>
              )}
            </header>

            <div className="profile-followed-artists-list">
              {followedArtists.slice(0, 10).map((artist) => (
                <Link
                  key={artist.catalogId || artist.id}
                  to={getArtistUrl(artist)}
                >
                  <span>
                    <ArtistImage artist={artist} />
                  </span>

                  <strong>{artist.name}</strong>
                </Link>
              ))}
            </div>

            {!followedArtists.length && (
              <p className="empty-state">
                Todavía no sigue artistas.
              </p>
            )}
          </section>
        </aside>
        {profile.isMe && <section className="profile-overview-wide profile-saved-section"><div className="section-header"><h2>Por reseñar</h2>{saved.length > 0 && <button className="text-button" type="button" onClick={() => setTab("saved")}>Ver todos</button>}</div><div className="result-grid profile-saved-grid">{saved.slice(0, 5).map((release) => <article key={release.catalogId || `${release.artist}-${release.album}`}><ReleaseCard release={release} /><button className="profile-card-remove" type="button" aria-label={`Quitar ${release.album}`} onClick={() => removeSaved(release)}><AppIcon name="x" size={16} /></button></article>)}</div>{!saved.length && <Link className="empty-state empty-state-action" to="/buscar"><span>Todavía no guardaste lanzamientos.</span><strong>Buscar para guardar →</strong></Link>}</section>}
        <section className="profile-overview-wide"><div className="section-header"><h2>Reseñas recientes</h2>{profile.reviews.length > 2 && <button className="text-button" type="button" onClick={() => setTab("reviews")}>Ver todas</button>}</div><div className="result-grid profile-review-list">{profile.reviews.slice(0, 2).map((review) => <ReviewCard key={review._id} review={{ ...review, author: profile }} />)}</div>{!profile.reviews.length && (profile.isMe ? <Link className="empty-state empty-state-action" to="/buscar"><span>Todavía no publicaste reseñas.</span><strong>Buscar un lanzamiento para reseñar →</strong></Link> : <p className="empty-state">Todavía no publicó reseñas.</p>)}</section>
        <section className="profile-overview-wide"><div className="section-header"><h2>Listas recientes</h2>{profile.lists.length > 2 && <button className="text-button" type="button" onClick={() => setTab("lists")}>Ver todas</button>}</div><div className="result-grid profile-list-list">{profile.lists.slice(0, 2).map((list) => <ListCard
  key={list._id}
  list={{
    ...list,
    author: profile,
    ownerName: list.ownerName || profile.nombre,
  }}
/>)}</div>{!profile.lists.length && (profile.isMe ? <Link className="empty-state empty-state-action" to="/listas?nueva=1"><span>Todavía no publicaste listas.</span><strong>Crear una lista →</strong></Link> : <p className="empty-state">Todavía no publicó listas.</p>)}</section>
      </div>}

      {profile.isMe && tab === "saved" && <section className="profile-tab-panel"><div className="section-header"><h2>Por reseñar</h2>{saved.length > 0 && <button className="text-button danger" type="button" onClick={() => setConfirmClear(true)}>Vaciar</button>}</div><div className="result-grid profile-saved-grid">{saved.map((release) => <article key={release.catalogId || `${release.artist}-${release.album}`}><ReleaseCard release={release} /><button className="profile-card-remove" type="button" aria-label={`Quitar ${release.album}`} onClick={() => removeSaved(release)}><AppIcon name="x" size={16} /></button></article>)}</div>{!saved.length && <Link className="empty-state empty-state-action" to="/buscar"><span>Todavía no guardaste lanzamientos.</span><strong>Buscar para guardar →</strong></Link>}</section>}
      {tab === "reviews" && <section className="profile-tab-panel"><div className="section-header"><h2>{profile.isMe ? "Tus reseñas" : `Reseñas de ${profile.nombre}`}</h2></div><div className="result-grid profile-review-list">{profile.reviews.map((review) => <ReviewCard key={review._id} review={{ ...review, author: profile }} />)}</div>{!profile.reviews.length && (profile.isMe ? <Link className="empty-state empty-state-action" to="/buscar"><span>Todavía no publicaste reseñas.</span><strong>Buscar un lanzamiento para reseñar →</strong></Link> : <p className="empty-state">Todavía no publicó reseñas.</p>)}</section>}
      {tab === "lists" && <section className="profile-tab-panel"><div className="section-header"><h2>{profile.isMe ? "Tus listas" : `Listas de 
      ${profile.nombre}`}</h2>
        </div><div className="result-grid profile-list-list">{profile.lists.map((list) => <ListCard
  key={list._id}
  list={{
    ...list,
    author: profile,
    ownerName: list.ownerName || profile.nombre,
  }}
/>)}</div>{!profile.lists.length && (profile.isMe ? <Link className="empty-state empty-state-action" to="/listas?nueva=1"><span>Todavía no publicaste listas.</span><strong>Crear una lista →</strong></Link> : <p className="empty-state">Todavía no publicó listas.</p>)}</section>}
      {tab === "users" && <section className="profile-tab-panel profile-users-panel">
        <div className="profile-users-filter" role="tablist" aria-label="Relaciones del perfil">
          <button type="button" role="tab" aria-selected={connections.type === "following"} className={connections.type === "following" ? "active" : ""} onClick={() => openConnections("following")}>Seguidos <span>{profile.following}</span></button>
          <button type="button" role="tab" aria-selected={connections.type === "followers"} className={connections.type === "followers" ? "active" : ""} onClick={() => openConnections("followers")}>Seguidores <span>{profile.followers}</span></button>
        </div>
        {connections.loading ? <p className="loading-text">Cargando…</p> : <div className="profile-users-list">{connections.items.map((person) => <article key={person._id}>
          <Link to={`/usuario/${person.handle}`}><Avatar user={person} size={48} /><span><strong>{person.nombre}</strong><small>@{person.handle}</small></span></Link>
          {String(person._id) !== String(usuario?._id) && <button className={`btn btn-sm ${person.isFollowing ? "btn-secondary" : "btn-primary"}`} type="button" onClick={() => toggleConnection(person)} disabled={connectionBusy === person._id}>{connectionBusy === person._id ? "…" : person.isFollowing ? "Siguiendo" : "Seguir"}</button>}
        </article>)}{!connections.items.length && <p className="empty-state">Todavía no hay personas para mostrar.</p>}</div>}
      </section>}
      {tab === "artists" && <section className="profile-tab-panel profile-users-panel profile-artists-panel">
        <div className="section-header">
          <h2>{profile.isMe ? "Artistas que seguís" : `Artistas que sigue ${profile.nombre}`}</h2>
        </div>
        <div className="profile-users-list profile-artists-list">
          {followedArtists.map((artist) => <article key={artist.catalogId || artist.id}>
            <Link to={getArtistUrl(artist)}>
              <span className="profile-artist-avatar">
                <ArtistImage artist={artist} />
              </span>
              <span>
                <strong>{artist.name}</strong>
                <small>Artista</small>
              </span>
            </Link>
          </article>)}
          {!followedArtists.length && <p className="empty-state">Todavía no hay artistas para mostrar.</p>}
        </div>
      </section>}
    </>}
  </main><Footer />

  {editing && account && <div className="profile-editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && cancelAccountEditing()}><form className="profile-account-editor" onSubmit={saveAccount}><div className="profile-editor-heading"><div><p className="eyebrow">Tu cuenta</p><h2>Editar perfil</h2></div><button type="button" onClick={cancelAccountEditing} aria-label="Cerrar"><AppIcon name="x" /></button></div>
<div className="profile-photo-editor">
  <span className="profile-photo">
    {account.avatarImage ? (
      <img src={account.avatarImage} alt="" />
    ) : (
      account.avatar
    )}
  </span>

  <div>
    <label className="btn btn-secondary btn-sm">
      Cambiar foto
      <input
        type="file"
        accept="image/*"
        onChange={image}
      />
    </label>
 </div>
</div>
    <div className="two-columns">
      <label>Nombre<input value={account.nombre} onChange={(event) => setAccount({ ...account, nombre: event.target.value })} required /></label>
      <label>Nombre de usuario<input value={account.handle} onChange={(event) => setAccount({ ...account, handle: event.target.value.toLowerCase() })} required /></label></div><label>Email<input type="email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} required /></label><label>Descripción<textarea value={account.bio} onChange={(event) => setAccount({ ...account, bio: event.target.value })} maxLength="280" /></label><fieldset className="password-editor"><legend>Cambiar contraseña <span>opcional</span></legend>{account.hasPassword !== false && <label>Contraseña actual<input type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required={Boolean(password.newPassword)} /></label>}<div className="two-columns"><label>Nueva contraseña<input type="password" minLength="8" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /></label><label>Repetir contraseña<input type="password" minLength="8" value={password.repeat} onChange={(event) => setPassword({ ...password, repeat: event.target.value })} /></label></div></fieldset><div className="form-actions"><button className="btn btn-tertiary" type="button" onClick={cancelAccountEditing}>Cancelar</button><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button></div></form></div>}

  <ConfirmDialog open={confirmClear} title="¿Vaciar Por reseñar?" description="Se quitarán todos los lanzamientos guardados en esta sección." confirmLabel="Vaciar lista" onCancel={() => setConfirmClear(false)} onConfirm={clearSaved} />
  </div>;
}
