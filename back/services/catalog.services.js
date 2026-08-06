import { HttpError } from "../utils/http-error.js";
import { getDb } from "../config/db.js";
import { escapeRegExp, normalizeText, slugify } from "../utils/text.js";

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const COVER_ART_BASE = "https://coverartarchive.org";
const PLACEHOLDER = "/images/cover-placeholder.png";
const MIN_REQUEST_INTERVAL = 1_050;
const DEFAULT_MEMORY_TTL = 15 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const PRIORITY_POP_ARTISTS = [
  // Estados Unidos
  "Ariana Grande",
  "Taylor Swift",
  "Lady Gaga",
  "Beyoncé",
  "Madonna",
  "Miley Cyrus",
  "Britney Spears",
  "Katy Perry",
  "Sabrina Carpenter",
  "Billie Eilish",
  "Olivia Rodrigo",
  "Chappell Roan",
  "Selena Gomez",
  "Doja Cat",
  "SZA",

  // Reino Unido
  "Dua Lipa",
  "Charli XCX",
  "Adele",
  "Jessie Ware",
  "RAYE",
  "Ellie Goulding",
  "Sam Smith",
  "Harry Styles",
  "Ed Sheeran",
  "Robbie Williams",
  "Florence + the Machine",
  "Rick Astley",
  "Pet Shop Boys",
  "Sophie Ellis-Bextor",

  // Artistas pop internacionales reconocibles
  "Kylie Minogue",
  "Troye Sivan",
  "Lorde",
  "Tate McRae",
];
const CACHE_POLICY = {
  search: { freshTtl: 60 * 60 * 1000, staleTtl: 14 * DAY },
  release: { freshTtl: 7 * DAY, staleTtl: 90 * DAY },
  tracks: { freshTtl: 30 * DAY, staleTtl: 180 * DAY },
  artist: { freshTtl: 7 * DAY, staleTtl: 90 * DAY },
  artistReleases: { freshTtl: 6 * 60 * 60 * 1000, staleTtl: 30 * DAY },
  newReleases: { freshTtl: 2 * 60 * 60 * 1000, staleTtl: 14 * DAY },
  cover: { freshTtl: 30 * DAY, staleTtl: 180 * DAY },
};
const cache = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function userAgent() {
  return (
    process.env.MUSICBRAINZ_USER_AGENT ||
    `musimo/1.0 (${process.env.CONTACT_EMAIL || "contacto@musimo.local"})`
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cached(key, loader, ttl = DEFAULT_MEMORY_TTL) {
  const hit = cache.get(key);
  if (hit?.expiresAt > Date.now()) return Promise.resolve(hit.value);
  if (hit?.promise) return hit.promise;

  const promise = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttl });
      return value;
    })
    .catch((error) => {
      if (hit?.value !== undefined) {
        cache.set(key, { value: hit.value, expiresAt: Date.now() + 60_000 });
        return hit.value;
      }
      cache.delete(key);
      throw error;
    });
  cache.set(key, { value: hit?.value, expiresAt: hit?.expiresAt || 0, promise });
  return promise;
}

async function readPersistentCache(key) {
  try {
    const db = await getDb();
    return await db.collection("catalog_cache").findOne({ _id: key });
  } catch {
    return null;
  }
}

async function writePersistentCache(key, value) {
  try {
    const db = await getDb();
    await db.collection("catalog_cache").updateOne(
      { _id: key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true },
    );
  } catch {
    // El caché persistente mejora la experiencia, pero no bloquea el catálogo.
  }
}

function persistentCached(key, loader, policy) {
  const memoryTtl = Math.min(policy.freshTtl, DEFAULT_MEMORY_TTL);
  return cached(key, async () => {
    const persisted = await readPersistentCache(key);
    const updatedAt = persisted?.updatedAt ? new Date(persisted.updatedAt).getTime() : 0;
    const age = updatedAt ? Date.now() - updatedAt : Number.POSITIVE_INFINITY;

    if (persisted?.value !== undefined && age <= policy.freshTtl) return persisted.value;

    const loadFresh = async () => {
      const value = await loader();
      await writePersistentCache(key, value);
      return value;
    };

    if (persisted?.value !== undefined && age <= policy.staleTtl) {
      void loadFresh()
        .then((value) => cache.set(key, { value, expiresAt: Date.now() + memoryTtl }))
        .catch(() => undefined);
      return persisted.value;
    }

    try {
      return await loadFresh();
    } catch (error) {
      if (persisted?.value !== undefined) return persisted.value;
      throw error;
    }
  }, memoryTtl);
}

async function queuedMusicBrainzFetch(pathname, { timeoutMs = 8_000, retries = 1 } = {}) {
  const task = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL) await wait(MIN_REQUEST_INTERVAL - elapsed);

    lastRequestAt = Date.now();
    let response;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      response = await fetch(`${MUSICBRAINZ_BASE}${pathname}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": userAgent(),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (![429, 503].includes(response.status) || attempt === retries) break;
      const retryAfter = Math.min(Number(response.headers.get("retry-after")) || 1.2, 2.5);
      await wait(retryAfter * 1000);
    }

    if (!response?.ok) {
      const error = new HttpError(
        response?.status === 503 ? 503 : 502,
        "El catálogo musical no está disponible en este momento.",
      );
      error.retryAfter = Number(response?.headers.get("retry-after")) || null;
      throw error;
    }

    return response.json();
  });

  requestQueue = task.catch(() => undefined);
  return task;
}

function fuzzyTerms(value = "") {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 8)
    .map((token) => `${token.replace(/[^a-z0-9]/g, "")}~`)
    .filter((token) => token.length > 1)
    .join(" AND ");
}

function artistCredit(credits = []) {
  return credits
    .map((credit) => `${credit.name || credit.artist?.name || ""}${credit.joinphrase || ""}`)
    .join("")
    .trim();
}

export function normalizeReleaseType(primaryType = "", secondaryTypes = []) {
  const primary = normalizeText(primaryType);
  const secondary = secondaryTypes.map(normalizeText);

  if (secondary.includes("compilation")) return "Compilación";
  if (primary === "single") return "Sencillo";
  return "Álbum";
}

function coverForReleaseGroup(id) {
  return id
    ? `${COVER_ART_BASE}/release-group/${id}/front-500`
    : PLACEHOLDER;
}

function normalizeReleaseGroup(release = {}) {
  const artist = artistCredit(release["artist-credit"]) || "Artista desconocido";
  const date = release["first-release-date"] || release.date || "";

  return {
    id: release.id,
    catalogId: release.id,
    album: release.title,
    title: release.title,
    artist,
    artistId: release["artist-credit"]?.[0]?.artist?.id || null,
    image: coverForReleaseGroup(release.id),
    year: date.slice(0, 4) || null,
    releaseDate: date || null,
    releaseType: normalizeReleaseType(
      release["primary-type"] || release["release-group"]?.["primary-type"],
      release["secondary-types"] ||
        release["release-group"]?.["secondary-types"] ||
        [],
    ),
    slug: slugify(`${artist}-${release.title}`),
    score: Number(release.score) || 0,
  };
}

function normalizeArtist(artist = {}) {
  return {
    id: artist.id,
    catalogId: artist.id,
    name: artist.name,
    sortName: artist["sort-name"] || artist.name,
    type: artist.type || "Artista",
    country: artist.country || null,
    disambiguation: artist.disambiguation || "",
    image: PLACEHOLDER,
    slug: slugify(artist.name),
    score: Number(artist.score) || 0,
  };
}

function artistsFromReleaseGroups(releases = []) {
  return uniqueById(
    releases.flatMap((release) =>
      (release["artist-credit"] || [])
        .map((credit) => credit.artist)
        .filter(Boolean),
    ),
  ).map(normalizeArtist);
}

function uniqueById(items = []) {
  return [...new Map(items.filter((item) => item.id).map((item) => [item.id, item])).values()];
}

function uniqueReleases(items = []) {
  return [...new Map(items.map((item) => [
    item.catalogId || item.id || `${normalizeText(item.artist)}|${normalizeText(item.album || item.title)}`,
    item,
  ])).values()];
}

async function releaseGroupHasCover(id) {
  if (!id) {
    return false;
  }

  return persistentCached(
    `cover-check:v1:${id}`,
    async () => {
      const response = await fetch(
        `${COVER_ART_BASE}/release-group/${encodeURIComponent(
          id,
        )}/front-500`,
        {
          method: "HEAD",
          redirect: "manual",
          headers: {
            "User-Agent": userAgent(),
          },
          signal: AbortSignal.timeout(5_000),
        },
      );

      /*
       * Cover Art Archive responde con una redirección
       * cuando encontró una portada.
       */
      if (
        response.ok ||
        (response.status >= 300 &&
          response.status < 400)
      ) {
        return true;
      }

      /*
       * Un 404 significa que el lanzamiento existe,
       * pero no tiene portada seleccionada.
       */
      if (response.status === 404) {
        return false;
      }

      /*
       * Los errores temporales no se guardan como
       * si fueran una portada inexistente.
       */
      throw new Error(
        `No se pudo validar la portada: ${response.status}`,
      );
    },
    CACHE_POLICY.cover,
  );
}

async function releaseHasUsableCover(release = {}) {
  const image = String(release.image || "");

  /*
   * Las portadas locales incluidas en Musimo
   * ya son seguras.
   */
  if (
    image.startsWith("/images/") &&
    !image.includes("cover-placeholder")
  ) {
    return true;
  }

  const catalogId =
    release.catalogId || release.id;

  if (!catalogId) {
    return false;
  }

  try {
    return await releaseGroupHasCover(catalogId);
  } catch {
    return false;
  }
}

async function takeReleasesWithCovers(
  releases = [],
  limit = 12,
) {
  const selected = [];
  const batchSize = 5;

  /*
   * Revisamos pequeños grupos en paralelo.
   * La función se detiene cuando ya reunió
   * la cantidad necesaria.
   */
  for (
    let index = 0;
    index < releases.length &&
    selected.length < limit;
    index += batchSize
  ) {
    const batch = releases.slice(
      index,
      index + batchSize,
    );

    const checked = await Promise.all(
      batch.map(async (release) => {
        const hasCover =
          await releaseHasUsableCover(release);

        return hasCover ? release : null;
      }),
    );

    selected.push(
      ...checked.filter(Boolean),
    );
  }

  return selected.slice(0, limit);
}

function sortReleasesNewestFirst(releases = []) {
  return [...releases].sort((left, right) => {
    const leftDate = String(left.releaseDate || left.year || "");
    const rightDate = String(right.releaseDate || right.year || "");
    const byDate = rightDate.localeCompare(leftDate);
    if (byDate) return byDate;
    return String(left.album || left.title || "").localeCompare(String(right.album || right.title || ""), "es");
  });
}

function textMatchScore(value, query) {
  const normalizedValue = normalizeText(value || "");
  const normalizedQuery = normalizeText(query || "");
  if (!normalizedValue || !normalizedQuery) return 0;
  if (normalizedValue === normalizedQuery) return 1_000;
  if (normalizedValue.startsWith(normalizedQuery)) return 720;
  if (normalizedQuery.startsWith(normalizedValue)) return 660;
  if (normalizedValue.includes(normalizedQuery)) return 540;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const valueTokens = new Set(normalizedValue.split(" ").filter(Boolean));
  if (!queryTokens.length) return 0;
  const shared = queryTokens.filter((token) => valueTokens.has(token)).length;
  return Math.round((shared / queryTokens.length) * 420);
}

function rankArtists(artists = [], query = "") {
  return uniqueById(artists).sort((left, right) => {
    const leftRank = textMatchScore(left.name, query) + Number(left.score || 0);
    const rightRank = textMatchScore(right.name, query) + Number(right.score || 0);
    if (rightRank !== leftRank) return rightRank - leftRank;
    return String(left.name || "").localeCompare(String(right.name || ""), "es");
  });
}

function rankReleases(releases = [], query = "") {
  return uniqueReleases(releases).sort((left, right) => {
    const leftRank =
      textMatchScore(left.album || left.title, query) * 1.35 +
      textMatchScore(left.artist, query) +
      Number(left.score || 0);
    const rightRank =
      textMatchScore(right.album || right.title, query) * 1.35 +
      textMatchScore(right.artist, query) +
      Number(right.score || 0);
    if (rightRank !== leftRank) return rightRank - leftRank;

    const leftDate = String(left.releaseDate || left.year || "");
    const rightDate = String(right.releaseDate || right.year || "");
    const byDate = rightDate.localeCompare(leftDate);
    if (byDate) return byDate;
    return String(left.album || left.title || "").localeCompare(String(right.album || right.title || ""), "es");
  });
}

function shouldExpandArtistReleases(artist, directReleases = [], query = "") {
  if (!artist?.id) return false;
  const clean = normalizeText(query);
  const artistName = normalizeText(artist.name);
  if (!clean || !artistName) return false;

  const exactReleaseTitle = directReleases.some(
    (release) => normalizeText(release.album || release.title) === clean,
  );
  const releasesByArtist = directReleases.filter(
    (release) => normalizeText(release.artist).includes(artistName),
  ).length;
  const strongArtistMatch =
    artistName === clean ||
    artistName.startsWith(clean) ||
    clean.startsWith(artistName) ||
    Number(artist.score || 0) >= 88;

  if (!strongArtistMatch) return false;
  if (exactReleaseTitle && clean.split(" ").length === 1) return false;
  return releasesByArtist < 6;
}

async function localSearchFallback(clean, limit) {
  try {
    const db = await getDb();
    const regex = new RegExp(escapeRegExp(clean), "i");
    const [reviews, listAlbums] = await Promise.all([
      db.collection("reviews").find(
        { $or: [{ album: regex }, { artist: regex }] },
        { projection: { catalogId: 1, album: 1, artist: 1, artistId: 1, image: 1, year: 1, releaseDate: 1, releaseType: 1 } },
      ).limit(limit).toArray(),
      db.collection("lists").aggregate([
        { $match: { visibility: { $ne: "private" } } },
        { $unwind: "$albums" },
        { $match: { $or: [{ "albums.album": regex }, { "albums.artist": regex }] } },
        { $replaceRoot: { newRoot: "$albums" } },
        { $limit: limit },
      ]).toArray(),
    ]);
    const releases = uniqueById([...reviews, ...listAlbums].map((release) => ({
      ...release,
      id: release.catalogId,
      catalogId: release.catalogId,
      title: release.album,
      slug: slugify(`${release.artist}-${release.album}`),
    }))).slice(0, limit);
    const artists = uniqueById(releases.filter((release) => release.artistId).map((release) => ({
      id: release.artistId,
      catalogId: release.artistId,
      name: release.artist,
      slug: slugify(release.artist),
      image: PLACEHOLDER,
      type: "Artista",
    }))).slice(0, limit);
    return { releases, artists };
  } catch {
    return { releases: [], artists: [] };
  }
}

async function localNewReleasesFallback(limit) {
  try {
    const db = await getDb();
    const [reviews, listAlbums] = await Promise.all([
      db.collection("reviews").find({}, {
        projection: { catalogId: 1, album: 1, artist: 1, artistId: 1, image: 1, year: 1, releaseDate: 1, releaseType: 1, createdAt: 1 },
      }).sort({ releaseDate: -1, createdAt: -1 }).limit(limit * 3).toArray(),
      db.collection("lists").aggregate([
        { $match: { visibility: { $ne: "private" } } },
        { $unwind: "$albums" },
        { $replaceRoot: { newRoot: "$albums" } },
        { $limit: limit * 3 },
      ]).toArray(),
    ]);

    return sortReleasesNewestFirst(uniqueReleases([...reviews, ...listAlbums]
      .filter((item) => item.album && item.artist)
      .map((item) => ({ ...item, id: item.catalogId, title: item.album, slug: slugify(`${item.artist}-${item.album}`) }))))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function searchCatalog(query, limit = 10, options = {}) {
  const clean = normalizeText(query);
  if (clean.length < 2) return { releases: [], artists: [] };

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const releaseLimit = Math.min(
    Math.max(Number(options.releaseLimit) || safeLimit * 2, safeLimit),
    100,
  );
  const expandArtist = Boolean(options.expandArtist);
  const terms = fuzzyTerms(clean);
  const exact = clean.replace(/[+\-&|!(){}[\]^"~*?:\/]/g, " ").trim();

  const key = `search:v3:${clean}:${safeLimit}:${expandArtist ? 1 : 0}:${releaseLimit}`;
  try {
    return await persistentCached(key, async () => {
      const releaseQuery = encodeURIComponent(
        `releasegroup:"${exact}"^6 OR artist:"${exact}"^5 OR artistname:"${exact}"^5 OR (${terms})`,
      );
      const artistQuery = encodeURIComponent(
        `artist:"${exact}"^7 OR alias:"${exact}"^5 OR (${terms})`,
      );

      const [releaseData, artistData] = await Promise.all([
        queuedMusicBrainzFetch(
          `/release-group?query=${releaseQuery}&fmt=json&limit=${safeLimit}`,
        ),
        queuedMusicBrainzFetch(
          `/artist?query=${artistQuery}&fmt=json&limit=${safeLimit}`,
        ),
      ]);

      const releaseGroups = releaseData["release-groups"] || [];
      const directReleases = rankReleases(
        uniqueById(releaseGroups).map(normalizeReleaseGroup),
        clean,
      );
      const artists = rankArtists(
        [
          ...(artistData.artists || []).map(normalizeArtist),
          ...artistsFromReleaseGroups(releaseGroups),
        ],
        clean,
      );

      let releases = directReleases;
      const topArtist = artists[0];
      if (
        expandArtist &&
        shouldExpandArtistReleases(topArtist, directReleases, clean)
      ) {
        const artistReleases = await getArtistReleases(
          topArtist.id,
          releaseLimit,
        );
        releases = rankReleases(
          [...directReleases, ...artistReleases],
          clean,
        );
      }

      return {
        releases: releases.slice(0, safeLimit),
        artists: artists.slice(0, safeLimit),
      };
    }, CACHE_POLICY.search);
  } catch (error) {
    const fallback = await localSearchFallback(clean, safeLimit);
    if (fallback.releases.length || fallback.artists.length) return fallback;
    throw error;
  }
}

async function getRawReleaseGroup(id) {
  return persistentCached(
    `release-group:${id}`,
    () => queuedMusicBrainzFetch(
      `/release-group/${encodeURIComponent(
        id,
      )}?inc=artist-credits+releases+tags&fmt=json`,
    ),
    CACHE_POLICY.release,
  );
}

export async function getReleaseGroup(id) {
  const group = await getRawReleaseGroup(id);
  const normalized = normalizeReleaseGroup(group);
  return {
    ...normalized,
    releaseCount: group.releases?.length || 0,
    tags: (group.tags || [])
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 8)
      .map((tag) => tag.name),
  };
}

export async function getReleaseTracks(id) {
  return persistentCached(`release-tracks:v2:${id}`, async () => {
    const group = await getRawReleaseGroup(id);
    const releaseCandidates = [...(group.releases || [])]
      .sort((left, right) => Number(right.status === "Official") - Number(left.status === "Official"))
      .slice(0, 5);
    for (const candidate of releaseCandidates) {
      if (!candidate?.id) continue;
      try {
        const release = await queuedMusicBrainzFetch(
          `/release/${candidate.id}?inc=recordings+artist-credits&fmt=json`,
          { timeoutMs: 8_000, retries: 1 },
        );
        const tracks = (release.media || []).flatMap((medium) =>
          (medium.tracks || []).map((track) => ({
            id: track.recording?.id || track.id,
            position: track.position,
            title: track.title || track.recording?.title,
            length: track.length || track.recording?.length || null,
          })),
        );
        if (tracks.length) return tracks;
      } catch {
        // Algunas ediciones no incluyen canciones; probamos una alternativa.
      }
    }
    return [];
  }, CACHE_POLICY.tracks);
}

export async function getArtist(id) {
  return persistentCached(`artist:${id}`, async () => {
    const artist = await queuedMusicBrainzFetch(
      `/artist/${encodeURIComponent(id)}?inc=tags+ratings&fmt=json`,
    );
    return {
      ...normalizeArtist(artist),
      genres: (artist.tags || [])
        .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
        .slice(0, 6)
        .map((tag) => tag.name),
      lifeSpan: artist["life-span"] || null,
    };
  }, CACHE_POLICY.artist);
}

export async function getArtistReleases(id, limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
  return persistentCached(`artist-releases:${id}:${safeLimit}`, async () => {
    const data = await queuedMusicBrainzFetch(
      `/release-group?artist=${encodeURIComponent(
        id,
      )}&inc=artist-credits&fmt=json&limit=${safeLimit}`,
    );
    return sortReleasesNewestFirst(uniqueById(data["release-groups"] || []).map(normalizeReleaseGroup));
  }, CACHE_POLICY.artistReleases);
}

function normalizeNewRelease(release = {}) {
  return {
    ...normalizeReleaseGroup(release),
    primaryType: release["primary-type"] || null,
  };
}

function isPriorityPopArtist(release = {}) {
  const artist = normalizeText(release.artist || "");

  return PRIORITY_POP_ARTISTS.some((name) => {
    const priorityName = normalizeText(name);

    return (
      artist === priorityName ||
      artist.includes(priorityName)
    );
  });
}

function isAlbumRelease(release = {}) {
  if (release.primaryType) {
    return normalizeText(release.primaryType) === "album";
  }

  return release.releaseType === "Álbum";
}

function curatedReleaseScore(release = {}) {
  let score = 0;

  // Primero aparecen los artistas más reconocibles.
  if (isPriorityPopArtist(release)) {
    score += 100;
  }

  // Dentro de cada grupo, los álbumes aparecen antes.
  if (isAlbumRelease(release)) {
    score += 20;
  }

  // Las compilaciones quedan relegadas.
  if (release.releaseType === "Compilación") {
    score -= 30;
  }

  return score;
}

function sortCuratedNewReleases(releases = []) {
  return [...releases].sort((left, right) => {
    const priorityDifference =
      curatedReleaseScore(right) -
      curatedReleaseScore(left);

    if (priorityDifference) {
      return priorityDifference;
    }

    const leftDate = String(
      left.releaseDate || left.year || "",
    );

    const rightDate = String(
      right.releaseDate || right.year || "",
    );

    const dateDifference =
      rightDate.localeCompare(leftDate);

    if (dateDifference) {
      return dateDifference;
    }

    return String(
      left.album || left.title || "",
    ).localeCompare(
      String(right.album || right.title || ""),
      "es",
    );
  });
}

export async function getNewReleases(
  limit = 12,
  options = {},
) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 12, 1),
    24,
  );

  const days = Math.min(
    Math.max(Number(options.days) || 90, 1),
    365,
  );

  const genre = normalizeText(
    options.genre || "",
  );

  const end = new Date();
  const start = new Date(end);

  start.setDate(start.getDate() - days);

  const date = (value) =>
    value.toISOString().slice(0, 10);

  const dateClause =
    `firstreleasedate:[${date(start)} TO ${date(end)}]`;

  /*
   * Búsqueda general:
   * conserva el género pop y el rango de fechas.
   */
  const genreClause = genre
    ? `tag:${genre.replace(/[^a-z0-9-]/g, "")}`
    : "";

  const generalQuery = encodeURIComponent(
    [genreClause, dateClause]
      .filter(Boolean)
      .join(" AND "),
  );

  /*
   * Búsqueda prioritaria:
   * busca artistas conocidos aunque el lanzamiento
   * todavía no tenga correctamente cargada la etiqueta pop.
   */
  const priorityArtistsClause =
    PRIORITY_POP_ARTISTS
      .map(
        (artist) =>
          `artistname:"${artist}"`,
      )
      .join(" OR ");

  const priorityQuery = encodeURIComponent(
    `(${priorityArtistsClause}) AND ${dateClause}`,
  );

  try {
    /*
     * Pedimos más resultados de los que finalmente
     * mostraremos para poder ordenarlos y seleccionarlos.
     */
    const fetchLimit = Math.min(
      Math.max(safeLimit * 5, 60),
      100,
    );

    const [priorityResult, generalResult] =
      await Promise.allSettled([
        persistentCached(
          `new:v3:priority:${days}:${date(end)}:${safeLimit}`,
          () =>
            queuedMusicBrainzFetch(
              `/release-group?query=${priorityQuery}&inc=artist-credits&fmt=json&limit=${fetchLimit}`,
            ),
          CACHE_POLICY.newReleases,
        ),

        persistentCached(
          `new:v3:${genre || "all"}:${days}:${date(end)}:${safeLimit}`,
          () =>
            queuedMusicBrainzFetch(
              `/release-group?query=${generalQuery}&inc=artist-credits&fmt=json&limit=${fetchLimit}`,
            ),
          CACHE_POLICY.newReleases,
        ),
      ]);

    const priorityGroups =
      priorityResult.status === "fulfilled"
        ? priorityResult.value["release-groups"] || []
        : [];

    const generalGroups =
      generalResult.status === "fulfilled"
        ? generalResult.value["release-groups"] || []
        : [];

    const groups = [
      ...priorityGroups,
      ...generalGroups,
    ];

    if (!groups.length) {
      throw new Error(
        "No se encontraron lanzamientos externos.",
      );
    }

    const releases = uniqueById(groups).map(
      normalizeNewRelease,
    );

    return sortCuratedNewReleases(
      releases,
    ).slice(0, safeLimit);
    
    } catch {
      const fallback =
        await localNewReleasesFallback(
          safeLimit * 3,
        );
    
      const orderedFallback =
        sortCuratedNewReleases(fallback);
    
      return takeReleasesWithCovers(
        orderedFallback,
        safeLimit,
      );
    }
}

export const catalogInternals = {
  fuzzyTerms,
  normalizeReleaseGroup,
  rankArtists,
  rankReleases,
  shouldExpandArtistReleases,
  sortReleasesNewestFirst,
  textMatchScore,
};
