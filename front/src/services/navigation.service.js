import { getAlbumUrl } from "./album-link.service";
import { getArtistUrl } from "./artist-link.service";
import { getBreadcrumbContext } from "./breadcrumb.service";

export function getAppHistoryIndex() {
  return Number(window.history.state?.idx || 0);
}

export function canGoBackInApp() {
  return getAppHistoryIndex() > 0;
}

export function getSemanticBackFallback(pathname = window.location.pathname) {
  const context = getBreadcrumbContext(pathname) || {};

  if (pathname.startsWith("/artista/")) {
    return "/buscar?categoria=artistas";
  }

  if (pathname.startsWith("/lanzamiento/")) {
    if (pathname.endsWith("/resenas") && context.release) {
      return getAlbumUrl(context.release);
    }

    if (context.release?.artist) {
      return getArtistUrl({
        id: context.release.artistId,
        name: context.release.artist,
      });
    }

    return "/buscar?categoria=lanzamientos";
  }

  if (pathname.startsWith("/resena/")) {
    return context.review
      ? getAlbumUrl(context.review)
      : "/buscar?categoria=lanzamientos";
  }

  if (pathname.startsWith("/resenas")) {
    return context.release
      ? getAlbumUrl(context.release)
      : "/buscar?categoria=lanzamientos";
  }

  if (pathname.startsWith("/lista") || pathname.startsWith("/listas")) {
    return "/comunidad?tipo=listas";
  }

  if (pathname.startsWith("/usuario/")) {
    return "/comunidad";
  }

  return "/inicio";
}
