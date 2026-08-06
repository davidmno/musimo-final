import { useEffect, useMemo, useState } from "react";
import {
  getCachedArtistImages,
  imagesFromReleases,
  removeFailedArtistImage,
  resolveArtistImages,
} from "../services/artist-image.service";

const EMPTY_RELEASES = [];

/**
 * Muestra una imagen coherente para un artista en cualquier pantalla.
 * La portada se resuelve con una única regla compartida y, si falla,
 * se prueba automáticamente la siguiente candidata disponible.
 */
export default function ArtistImage({
  artist,
  releases = EMPTY_RELEASES,
  alt = "",
  loading = "lazy",
  onResolve,
}) {
  const artistCatalogId = artist?.catalogId || "";
  const artistId = artist?.id || "";
  const artistName = artist?.name || "";
  const fallbackImage = artistCatalogId || artistId ? "" : artist?.image || "";

  /*
   * Para artistas con identificador no dependemos de una imagen guardada por
   * una pantalla anterior. El identificador es la fuente estable de verdad.
   */
  const normalizedArtist = useMemo(
    () => ({
      id: artistId,
      catalogId: artistCatalogId,
      name: artistName,
      image: fallbackImage,
    }),
    [artistCatalogId, artistId, artistName, fallbackImage],
  );

  const initialImages = useMemo(() => {
    const fromReleases = imagesFromReleases(releases);

    return fromReleases.length
      ? fromReleases
      : getCachedArtistImages(normalizedArtist);
  }, [normalizedArtist, releases]);

  const [images, setImages] = useState(initialImages);

  useEffect(() => {
    let active = true;

    setImages(initialImages);

    resolveArtistImages(normalizedArtist, releases).then((resolved) => {
      if (active && resolved.length) {
        setImages(resolved);
      }
    });

    return () => {
      active = false;
    };
  }, [initialImages, normalizedArtist, releases]);

  const image = images[0] || "";

  if (!image) {
    return <span aria-hidden="true">{artistName.slice(0, 1) || "A"}</span>;
  }

  return (
    <img
      src={image}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={() => onResolve?.(image)}
      onError={() => {
        setImages((current) => {
          const remaining = removeFailedArtistImage(normalizedArtist, image);

          return remaining.length
            ? remaining
            : current.filter((candidate) => candidate !== image);
        });
      }}
    />
  );
}
