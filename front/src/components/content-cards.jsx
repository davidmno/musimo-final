import { Link } from "react-router-dom";
import { getAlbumUrl } from "../services/album-link.service";
import useClampedContent from "../hooks/use-clamped-content";
import AppIcon from "./app-icon";

function fallbackCover(event) {
  if (!event.currentTarget.src.endsWith("/images/cover-placeholder.png")) {
    event.currentTarget.src = "/images/cover-placeholder.png";
  }
}

export function Avatar({ user, size = 40 }) {
  const label = user?.nombre || user?.name || "Usuario";
  return (
    <span className="avatar" style={{ "--avatar-size": `${size}px` }} aria-hidden="true">
      {user?.avatarImage ? <img src={user.avatarImage} alt="" decoding="async" onError={fallbackCover} /> : user?.avatar || label.slice(0, 1).toUpperCase()}
    </span>
  );
}

function shortReleaseDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date);
}

export function ReleaseCard({ release, compact = false, recentDate = false }) {
  const metadata = recentDate
    ? shortReleaseDate(release.releaseDate || release.date)
    : [release.releaseType, release.year].filter(Boolean).join(" · ");
  return (
    <Link className={compact ? "content-row" : "release-tile"} to={getAlbumUrl(release)}>
      <img src={release.image || "/images/cover-placeholder.png"} alt={`Portada de ${release.album}`} loading="lazy" decoding="async" onError={fallbackCover} />
      <span className="card-copy">
        <strong>{release.album}</strong>
        <span>{release.artist}</span>
        {metadata && <small>{metadata}</small>}
      </span>
      <AppIcon name="chevron-right" size={18} className="card-enter-icon" />
    </Link>
  );
}

function ReviewExcerpt({ text = "" }) {
  const { ref, isClamped } = useClampedContent(text);

  return (
    <>
      <p ref={ref} className="story-excerpt story-excerpt--clamped">{text}</p>
      {isClamped && <span className="story-read-more">Leer más</span>}
    </>
  );
}

export function RatingStars({
  value = 0,
  showEmpty = false,
  className = "",
}) {
  const rating = Math.max(
    0,
    Math.min(5, Math.round(Number(value) || 0)),
  );

  if (!rating && !showEmpty) {
    return null;
  }

  const classes = [
    "rating-stars",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      role="img"
      aria-label={
        rating
          ? `${rating} de 5 estrellas`
          : "Sin valoración"
      }
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <AppIcon
          key={star}
          name="star"
          className={
            star <= rating
              ? "rating-star is-filled"
              : "rating-star"
          }
          fill={
            star <= rating
              ? "currentColor"
              : "none"
          }
        />
      ))}
    </span>
  );
}

export function ReviewCard({
  review,
  compact = false,
  preview = false,
  showEmptyRating = false,
  hideReleaseImage = false,
}) {
  const author = review.author || { nombre: review.username, handle: "" };
  const rating = Number(review.rating) || 0;
  const showRating = rating > 0 || showEmptyRating;
  return (
    <article className={`${compact ? "content-row story-row" : "story-tile"}${preview ? " story-tile--preview" : ""}`}>
      <Link className="story-tile-main" to={`/resena/${review._id}`}>
        <span className="story-author"><Avatar user={author} size={32} /><span>Reseña de <b>{author?.nombre || "Usuario"}</b></span></span>
        <span className="story-release-copy">
          <span>
            <strong>{review.album}</strong>
            <span>{review.artist}</span>
          </span>
          {!hideReleaseImage && review.image && (
            <img
              src={review.image}
              alt=""
              loading="lazy"
              decoding="async"
              onError={fallbackCover}
            />
          )}
        </span>
        {showRating && (
          <RatingStars
            value={rating}
            showEmpty={showEmptyRating}
            className="rating-label"
          />
        )}
        <ReviewExcerpt text={review.text} />
      </Link>
    </article>
  );
}

export function ListCard({ list, compact = false }) {
  const albums = list.albums || [];

  const author = list.author || {
    nombre: list.ownerName || "Comunidad",
    avatar:
      list.ownerAvatar ||
      list.ownerName?.slice(0, 1) ||
      "C",
    avatarImage: list.ownerAvatarImage || "",
  };

  return (
    <Link className={compact ? "content-row list-row" : "list-tile"} to={`/lista/${list._id}`}>
      <span className="cover-stack" aria-hidden="true">
        {albums.slice(0, 3).map((album, index) => (
          <img key={`${album.catalogId || album.album}-${index}`} src={album.image || "/images/cover-placeholder.png"} alt="" loading="lazy" decoding="async" onError={fallbackCover} style={{ "--stack-index": index }} />
        ))}
        {!albums.length && <span className="cover-placeholder">m</span>}
      </span>
      <span className="card-copy">
        <strong>{list.title}</strong>
        <span className="card-author">
          <Avatar user={author} size={24} />
          {author.nombre || list.ownerName || "Comunidad"}
        </span>
        <small>{albums.length} lanzamientos</small>
      </span>
      <AppIcon name="chevron-right" size={18} className="card-enter-icon" />
    </Link>
  );
}

export { fallbackCover };
