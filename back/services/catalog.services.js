import { HttpError } from "../utils/http-error.js";
import { getDb } from "../config/db.js";
import {
  escapeRegExp,
  normalizeText,
  slugify,
} from "../utils/text.js";

const MUSICBRAINZ_BASE =
  "https://musicbrainz.org/ws/2";
const COVER_ART_BASE =
  "https://coverartarchive.org";
const PLACEHOLDER =
  "/images/cover-placeholder.png";
const MIN_REQUEST_INTERVAL = 1_050;
const DEFAULT_MEMORY_TTL =
  15 * 60 * 1000;
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
  search: {
    freshTtl: 60 * 60 * 1000,
    staleTtl: 14 * DAY,
  },
  release: {
    freshTtl: 7 * DAY,
    staleTtl: 90 * DAY,
  },
  tracks: {
    freshTtl: 30 * DAY,
    staleTtl: 180 * DAY,
  },
  artist: {
    freshTtl: 7 * DAY,
    staleTtl: 90 * DAY,
  },
  artistReleases: {
    freshTtl: 6 * 60 * 60 * 1000,
    staleTtl: 30 * DAY,
  },
  newReleases: {
    freshTtl: 2 * 60 * 60 * 1000,
    staleTtl: 14 * DAY,
  },
  cover: {
    freshTtl: 30 * DAY,
    staleTtl: 180 * DAY,
  },
};

const cache = new Map();

let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function userAgent() {
  return (
    process.env.MUSICBRAINZ_USER_AGENT ||
    `musimo/1.0 (${
      process.env.CONTACT_EMAIL ||
      "contacto@musimo.local"
    })`
  );
}

function wait(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function cached(
  key,
  loader,
  ttl = DEFAULT_MEMORY_TTL,
) {
  const hit = cache.get(key);

  if (hit?.expiresAt > Date.now()) {
    return Promise.resolve(hit.value);
  }

  if (hit?.promise) {
    return hit.promise;
  }

  const promise = loader()
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttl,
      });

      return value;
    })
    .catch((error) => {
      if (hit?.value !== undefined) {
        cache.set(key, {
          value: hit.value,
          expiresAt: Date.now() + 60_000,
        });

        return hit.value;
      }

      cache.delete(key);
      throw error;
    });

  cache.set(key, {
    value: hit?.value,
    expiresAt: hit?.expiresAt || 0,
    promise,
  });

  return promise;
}

async function readPersistentCache(key) {
  try {
    const db = await getDb();

    return await db
      .collection("catalog_cache")
      .findOne({ _id: key });
  } catch {
    return null;
  }
}

async function writePersistentCache(
  key,
  value,
) {
  try {
    const db = await getDb();

    await db
      .collection("catalog_cache")
      .updateOne(
        { _id: key },
        {
          $set: {
            value,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
  } catch {
    /*
     * El caché persistente mejora la experiencia,
     * pero no bloquea el catálogo.
     */
  }
}

function persistentCached(
  key,
  loader,
  policy,
) {
  const memoryTtl = Math.min(
    policy.freshTtl,
    DEFAULT_MEMORY_TTL,
  );

  return cached(
    key,
    async () => {
      const persisted =
        await readPersistentCache(key);

      const updatedAt =
        persisted?.updatedAt
          ? new Date(
              persisted.updatedAt,
            ).getTime()
          : 0;

      const age = updatedAt
        ? Date.now() - updatedAt
        : Number.POSITIVE_INFINITY;

      if (
        persisted?.value !== undefined &&
        age <= policy.freshTtl
      ) {
        return persisted.value;
      }

      const loadFresh = async () => {
        const value = await loader();

        await writePersistentCache(
          key,
          value,
        );

        return value;
      };

      if (
        persisted?.value !== undefined &&
        age <= policy.staleTtl
      ) {
        void loadFresh()
          .then((value) =>
            cache.set(key, {
              value,
              expiresAt:
                Date.now() + memoryTtl,
            }),
          )
          .catch(() => undefined);

        return persisted.value;
      }

      try {
        return await loadFresh();
      } catch (error) {
        if (
          persisted?.value !== undefined
        ) {
          return persisted.value;
        }

        throw error;
      }
    },
    memoryTtl,
  );
}

async function queuedMusicBrainzFetch(
  pathname,
  {
    timeoutMs = 8_000,
    retries = 1,
  } = {},
) {
  const task = requestQueue.then(
    async () => {
      const elapsed =
        Date.now() - lastRequestAt;

      if (
        elapsed < MIN_REQUEST_INTERVAL
      ) {
        await wait(
          MIN_REQUEST_INTERVAL - elapsed,
        );
      }

      lastRequestAt = Date.now();

      let response;

      for (
        let attempt = 0;
        attempt <= retries;
        attempt += 1
      ) {
        response = await fetch(
          `${MUSICBRAINZ_BASE}${pathname}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": userAgent(),
            },
            signal:
              AbortSignal.timeout(
                timeoutMs,
              ),
          },
        );

        if (
          ![429, 503].includes(
            response.status,
          ) ||
          attempt === retries
        ) {
          break;
        }

        const retryAfter = Math.min(
          Number(
            response.headers.get(
              "retry-after",
            ),
          ) || 1.2,
          2.5,
        );

        await wait(retryAfter * 1000);
      }

      if (!response?.ok) {
        const error = new HttpError(
          response?.status === 503
            ? 503
            : 502,
          "El catálogo musical no está disponible en este momento.",
        );

        error.retryAfter =
          Number(
            response?.headers.get(
              "retry-after",
            ),
          ) || null;

        throw error;
      }

      return response.json();
    },
  );

  requestQueue = task.catch(
    () => undefined,
  );

  return task;
}

function fuzzyTerms(value = "") {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 8)
    .map(
      (token) =>
        `${token.replace(
          /[^a-z0-9]/g,
          "",
        )}~`,
    )
    .filter(
      (token) => token.length > 1,
    )
    .join(" AND ");
}

function artistCredit(credits = []) {
  return credits
    .map(
      (credit) =>
        `${
          credit.name ||
          credit.artist?.name ||
          ""
        }${credit.joinphrase || ""}`,
    )
    .join("")
    .trim();
}

export function normalizeReleaseType(
  primaryType = "",
  secondaryTypes = [],
) {
  const primary =
    normalizeText(primaryType);

  const secondary =
    secondaryTypes.map(normalizeText);

  if (
    secondary.includes("compilation")
  ) {
    return "Compilación";
  }

  if (primary === "single") {
    return "Sencillo";
  }

  return "Álbum";
}

function coverForReleaseGroup(id) {
  return id
    ? `${COVER_ART_BASE}/release-group/${id}/front-500`
    : PLACEHOLDER;
}

function normalizeReleaseGroup(
  release = {},
) {
  const artist =
    artistCredit(
      release["artist-credit"],
    ) || "Artista desconocido";

  const date =
    release["first-release-date"] ||
    release.date ||
    "";

  return {
    id: release.id,
    catalogId: release.id,
    album: release.title,
    title: release.title,
    artist,
    artistId:
      release["artist-credit"]?.[0]
        ?.artist?.id || null,
    image: coverForReleaseGroup(
      release.id,
    ),
    year: date.slice(0, 4) || null,
    releaseDate: date || null,
    releaseType: normalizeReleaseType(
      release["primary-type"] ||
        release["release-group"]?.[
          "primary-type"
        ],
      release["secondary-types"] ||
        release["release-group"]?.[
          "secondary-types"
        ] ||
        [],
    ),
    slug: slugify(
      `${artist}-${release.title}`,
    ),
    score:
      Number(release.score) || 0,
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
    aliases: (artist.aliases || [])
      .map(
        (alias) =>
          alias.name || alias["sort-name"],
      )
      .filter(Boolean),
    lifeSpan: artist["life-span"] || null,
    image: PLACEHOLDER,
    slug: slugify(artist.name),
    score: Number(artist.score) || 0,
  };
}

function artistsFromReleaseGroups(
  releases = [],
) {
  return uniqueById(
    releases.flatMap((release) =>
      (
        release["artist-credit"] ||
        []
      )
        .map(
          (credit) =>
            credit.artist,
        )
        .filter(Boolean),
    ),
  ).map(normalizeArtist);
}

function uniqueById(items = []) {
  return [
    ...new Map(
      items
        .filter((item) => item.id)
        .map((item) => [
          item.id,
          item,
        ]),
    ).values(),
  ];
}

function uniqueReleases(items = []) {
  return [
    ...new Map(
      items.map((item) => [
        item.catalogId ||
          item.id ||
          `${normalizeText(
            item.artist,
          )}|${normalizeText(
            item.album ||
              item.title,
          )}`,
        item,
      ]),
    ).values(),
  ];
}

async function releaseGroupHasCover(
  id,
) {
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
          signal:
            AbortSignal.timeout(
              3_000,
            ),
        },
      );

      /*
       * Cover Art Archive responde
       * con una redirección cuando
       * encontró una portada.
       */
      if (
        response.ok ||
        (response.status >= 300 &&
          response.status < 400)
      ) {
        return true;
      }

      /*
       * Un 404 significa que el
       * lanzamiento existe, pero
       * no tiene portada seleccionada.
       */
      if (response.status === 404) {
        return false;
      }

      /*
       * Los errores temporales no
       * se guardan como si fueran
       * una portada inexistente.
       */
      throw new Error(
        `No se pudo validar la portada: ${response.status}`,
      );
    },
    CACHE_POLICY.cover,
  );
}

async function releaseHasUsableCover(
  release = {},
) {
  const image = String(
    release.image || "",
  );

  /*
   * Las portadas locales incluidas
   * en Musimo ya son seguras.
   */
  if (
    image.startsWith("/images/") &&
    !image.includes(
      "cover-placeholder",
    )
  ) {
    return true;
  }

  const catalogId =
    release.catalogId || release.id;

  if (!catalogId) {
    return false;
  }

  try {
    return await releaseGroupHasCover(
      catalogId,
    );
  } catch {
    return false;
  }
}

async function takeReleasesWithCovers(
  releases = [],
  limit = 12,
) {
  const selected = [];
  const batchSize = 12;
  const candidates = releases.slice(0, Math.max(limit * 3, limit));

  /*
   * Revisamos pequeños grupos
   * en paralelo.
   *
   * La función se detiene cuando
   * ya reunió la cantidad necesaria.
   */
  for (
    let index = 0;
    index < candidates.length &&
    selected.length < limit;
    index += batchSize
  ) {
    const batch = candidates.slice(
      index,
      index + batchSize,
    );

    const checked =
      await Promise.all(
        batch.map(
          async (release) => {
            const hasCover =
              await releaseHasUsableCover(
                release,
              );

            return hasCover
              ? release
              : null;
          },
        ),
      );

    selected.push(
      ...checked.filter(Boolean),
    );
  }

  return selected.slice(0, limit);
}

function sortReleasesNewestFirst(
  releases = [],
) {
  return [...releases].sort(
    (left, right) => {
      const leftDate = String(
        left.releaseDate ||
          left.year ||
          "",
      );

      const rightDate = String(
        right.releaseDate ||
          right.year ||
          "",
      );

      const byDate =
        rightDate.localeCompare(
          leftDate,
        );

      if (byDate) {
        return byDate;
      }

      return String(
        left.album ||
          left.title ||
          "",
      ).localeCompare(
        String(
          right.album ||
            right.title ||
            "",
        ),
        "es",
      );
    },
  );
}

function textMatchScore(
  value,
  query,
) {
  const normalizedValue =
    normalizeText(value || "");

  const normalizedQuery =
    normalizeText(query || "");

  if (
    !normalizedValue ||
    !normalizedQuery
  ) {
    return 0;
  }

  if (
    normalizedValue ===
    normalizedQuery
  ) {
    return 1_000;
  }

  if (
    normalizedValue.startsWith(
      normalizedQuery,
    )
  ) {
    return 720;
  }

  if (
    normalizedQuery.startsWith(
      normalizedValue,
    )
  ) {
    return 660;
  }

  if (
    normalizedValue.includes(
      normalizedQuery,
    )
  ) {
    return 540;
  }

  const queryTokens =
    normalizedQuery
      .split(" ")
      .filter(Boolean);

  const valueTokens = new Set(
    normalizedValue
      .split(" ")
      .filter(Boolean),
  );

  if (!queryTokens.length) {
    return 0;
  }

  const shared =
    queryTokens.filter((token) =>
      valueTokens.has(token),
    ).length;

  return Math.round(
    (shared / queryTokens.length) *
      420,
  );
}

function artistReleaseEvidence(
  releaseGroups = [],
) {
  const evidence = new Map();

  releaseGroups.forEach((release) => {
    (release["artist-credit"] || []).forEach(
      (credit) => {
        const artistId = credit.artist?.id;

        if (!artistId) {
          return;
        }

        evidence.set(
          artistId,
          (evidence.get(artistId) || 0) + 1,
        );
      },
    );
  });

  return evidence;
}

function artistMetadataScore(artist = {}) {
  let score = 0;

  /*
   * Un artista con tipo, país, período de actividad
   * o descripción suele ser una entrada mejor
   * documentada en MusicBrainz.
   */
  if (
    artist.type &&
    artist.type !== "Artista"
  ) {
    score += 35;
  }

  if (artist.country) {
    score += 35;
  }

  if (artist.disambiguation) {
    score += 30;
  }

  if (artist.lifeSpan?.begin) {
    score += 25;
  }

  if (artist.aliases?.length) {
    score += 20;
  }

  return score;
}

function isPriorityArtist(artist = {}) {
  const name = normalizeText(
    artist.name || "",
  );

  return PRIORITY_POP_ARTISTS.some(
    (priorityName) =>
      normalizeText(priorityName) === name,
  );
}

function rankArtists(
  artists = [],
  query = "",
  releaseGroups = [],
) {
  const clean = normalizeText(query);

  const queryWords = clean
    .split(" ")
    .filter(Boolean);

  /*
   * También consideramos si el artista aparece
   * en los lanzamientos encontrados.
   */
  const evidence =
    artistReleaseEvidence(releaseGroups);

  const scored = uniqueById(artists)
    .map((artist) => {
      const nameMatch = textMatchScore(
        artist.name,
        clean,
      );

      const aliasMatch = Math.max(
        0,
        ...(artist.aliases || []).map(
          (alias) =>
            textMatchScore(alias, clean),
        ),
      );

      const directMatch = Math.max(
        nameMatch,
        aliasMatch,
      );

      const musicBrainzScore = Number(
        artist.score || 0,
      );

      const releaseMatches =
        evidence.get(artist.id) || 0;

      const normalizedName = normalizeText(
        artist.name || "",
      );

      /*
       * MusicBrainz contiene entradas llamadas
       * solamente "Kylie" que casi no tienen datos.
       *
       * No las eliminamos por completo, pero les
       * quitamos prioridad frente a artistas
       * correctamente documentados.
       */
      const weakBareExactMatch =
        queryWords.length === 1 &&
        normalizedName === clean &&
        !artist.country &&
        !artist.disambiguation &&
        !artist.lifeSpan?.begin;

      const rank =
        /*
         * Coincidencia por nombre o alias.
         */
        Math.max(
          nameMatch,
          aliasMatch * 0.95,
        ) +

        /*
         * Puntaje original de MusicBrainz.
         */
        musicBrainzScore * 4 +

        /*
         * Calidad de la información disponible.
         */
        artistMetadataScore(artist) +

        /*
         * Presencia en los lanzamientos encontrados.
         */
        Math.min(
          releaseMatches * 120,
          360,
        ) +

        /*
         * Artistas reconocibles definidos
         * para la experiencia de Musimo.
         */
        (isPriorityArtist(artist)
          ? 500
          : 0) -

        /*
         * Penalización para entradas genéricas
         * que solamente tienen un nombre.
         */
        (weakBareExactMatch
          ? 300
          : 0);

      return {
        artist,
        rank,
        directMatch,
        musicBrainzScore,
      };
    })

    /*
     * Conservamos coincidencias textuales o resultados
     * que MusicBrainz considere suficientemente fuertes.
     *
     * Esto mantiene la tolerancia a errores como
     * "kilie" o "madona".
     */
    .filter(
      ({
        directMatch,
        musicBrainzScore,
      }) =>
        directMatch > 0 ||
        musicBrainzScore >= 70,
    )

    .sort((left, right) => {
      if (right.rank !== left.rank) {
        return right.rank - left.rank;
      }

      return String(
        left.artist.name || "",
      ).localeCompare(
        String(
          right.artist.name || "",
        ),
        "es",
      );
    });

  /*
   * MusicBrainz puede tener cinco identificadores
   * diferentes cuyo nombre visible es "Kylie".
   *
   * Para el usuario representan un duplicado,
   * por lo que conservamos únicamente el resultado
   * mejor posicionado de cada nombre.
   */
  const names = new Set();

  return scored
    .filter(({ artist }) => {
      const key = normalizeText(
        artist.name || "",
      );

      if (!key || names.has(key)) {
        return false;
      }

      names.add(key);
      return true;
    })
    .map(({ artist }) => artist);
}

function rankReleases(
  releases = [],
  query = "",
) {
  return uniqueReleases(
    releases,
  ).sort((left, right) => {
    const leftRank =
      textMatchScore(
        left.album || left.title,
        query,
      ) *
        1.35 +
      textMatchScore(
        left.artist,
        query,
      ) +
      Number(left.score || 0);

    const rightRank =
      textMatchScore(
        right.album || right.title,
        query,
      ) *
        1.35 +
      textMatchScore(
        right.artist,
        query,
      ) +
      Number(right.score || 0);

    if (rightRank !== leftRank) {
      return rightRank - leftRank;
    }

    const leftDate = String(
      left.releaseDate ||
        left.year ||
        "",
    );

    const rightDate = String(
      right.releaseDate ||
        right.year ||
        "",
    );

    const byDate =
      rightDate.localeCompare(
        leftDate,
      );

    if (byDate) {
      return byDate;
    }

    return String(
      left.album ||
        left.title ||
        "",
    ).localeCompare(
      String(
        right.album ||
          right.title ||
          "",
      ),
      "es",
    );
  });
}

function shouldExpandArtistReleases(
  artist,
  directReleases = [],
  query = "",
) {
  if (!artist?.id) {
    return false;
  }

  const clean =
    normalizeText(query);

  const artistName =
    normalizeText(artist.name);

  if (!clean || !artistName) {
    return false;
  }

  const exactReleaseTitle =
    directReleases.some(
      (release) =>
        normalizeText(
          release.album ||
            release.title,
        ) === clean,
    );

  const releasesByArtist =
    directReleases.filter(
      (release) =>
        normalizeText(
          release.artist,
        ).includes(artistName),
    ).length;

  const strongArtistMatch =
    artistName === clean ||
    artistName.startsWith(clean) ||
    clean.startsWith(artistName) ||
    Number(artist.score || 0) >= 88;

  if (!strongArtistMatch) {
    return false;
  }

  if (
    exactReleaseTitle &&
    clean.split(" ").length === 1
  ) {
    return false;
  }

  return releasesByArtist < 6;
}

async function localSearchFallback(
  clean,
  limit,
) {
  try {
    const db = await getDb();

    const regex = new RegExp(
      escapeRegExp(clean),
      "i",
    );

    const [reviews, listAlbums] =
      await Promise.all([
        db
          .collection("reviews")
          .find(
            {
              $or: [
                { album: regex },
                { artist: regex },
              ],
            },
            {
              projection: {
                catalogId: 1,
                album: 1,
                artist: 1,
                artistId: 1,
                image: 1,
                year: 1,
                releaseDate: 1,
                releaseType: 1,
              },
            },
          )
          .limit(limit)
          .toArray(),

        db
          .collection("lists")
          .aggregate([
            {
              $match: {
                visibility: {
                  $ne: "private",
                },
              },
            },
            {
              $unwind: "$albums",
            },
            {
              $match: {
                $or: [
                  {
                    "albums.album":
                      regex,
                  },
                  {
                    "albums.artist":
                      regex,
                  },
                ],
              },
            },
            {
              $replaceRoot: {
                newRoot: "$albums",
              },
            },
            {
              $limit: limit,
            },
          ])
          .toArray(),
      ]);

    const releases = uniqueById(
      [...reviews, ...listAlbums].map(
        (release) => ({
          ...release,
          id: release.catalogId,
          catalogId:
            release.catalogId,
          title: release.album,
          slug: slugify(
            `${release.artist}-${release.album}`,
          ),
        }),
      ),
    ).slice(0, limit);

    const artists = uniqueById(
      releases
        .filter(
          (release) =>
            release.artistId,
        )
        .map((release) => ({
          id: release.artistId,
          catalogId:
            release.artistId,
          name: release.artist,
          slug: slugify(
            release.artist,
          ),
          image: PLACEHOLDER,
          type: "Artista",
        })),
    ).slice(0, limit);

    return {
      releases,
      artists,
    };
  } catch {
    return {
      releases: [],
      artists: [],
    };
  }
}

async function localNewReleasesFallback(
  limit,
  startDate,
  endDate,
) {
  try {
    const db = await getDb();

    const [reviews, listAlbums] =
      await Promise.all([
        db
          .collection("reviews")
          .find(
            {
              releaseDate: {
                $gte: startDate,
                $lte: endDate,
              },
            },
            {
              projection: {
                catalogId: 1,
                album: 1,
                artist: 1,
                artistId: 1,
                image: 1,
                year: 1,
                releaseDate: 1,
                releaseType: 1,
                createdAt: 1,
              },
            },
          )
          .sort({
            releaseDate: -1,
            createdAt: -1,
          })
          .limit(limit * 3)
          .toArray(),

        db
          .collection("lists")
          .aggregate([
            {
              $match: {
                visibility: {
                  $ne: "private",
                },
              },
            },
            {
              $unwind: "$albums",
            },
            {
              $match: {
                "albums.releaseDate": {
                  $gte: startDate,
                  $lte: endDate,
                },
              },
            },
            {
              $replaceRoot: {
                newRoot: "$albums",
              },
            },
            {
              $sort: {
                releaseDate: -1,
              },
            },
            {
              $limit: limit * 3,
            },
          ])
          .toArray(),
      ]);

    return uniqueReleases(
      [...reviews, ...listAlbums]
        .filter(
          (item) =>
            item.album &&
            item.artist &&
            isReleaseInsideDateRange(
              item,
              startDate,
              endDate,
            ),
        )
        .map((item) => ({
          ...item,
          id: item.catalogId,
          title: item.album,
          slug: slugify(
            `${item.artist}-${item.album}`,
          ),
        })),
    ).slice(0, limit);
  } catch {
    return [];
  }
}

export async function searchCatalog(
  query,
  limit = 10,
  options = {},
) {
  const clean = normalizeText(query);

  if (clean.length < 2) {
    return {
      releases: [],
      artists: [],
    };
  }

  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 10,
      1,
    ),
    20,
  );

  const releaseLimit = Math.min(
    Math.max(
      Number(options.releaseLimit) ||
        safeLimit * 2,
      safeLimit,
    ),
    100,
  );

  const expandArtist = Boolean(
    options.expandArtist,
  );

  const terms = fuzzyTerms(clean);

  const exact = clean
    .replace(
      /[+\-&|!(){}[\]^"~*?:\/]/g,
      " ",
    )
    .trim();

  /*
   * Cambiamos v3 por v4 para no reutilizar
   * los resultados defectuosos guardados.
   */
  const key =
    `search:v5:${clean}:` +
    `${safeLimit}:` +
    `${expandArtist ? 1 : 0}:` +
    `${releaseLimit}`;

  try {
    return await persistentCached(
      key,
      async () => {
        const releaseQuery =
          encodeURIComponent(
            `releasegroup:"${exact}"^6 OR ` +
              `artist:"${exact}"^5 OR ` +
              `artistname:"${exact}"^5 OR ` +
              `(${terms})`,
          );

        const artistQuery =
          encodeURIComponent(
            `artist:"${exact}"^7 OR ` +
              `alias:"${exact}"^5 OR ` +
              `(${terms})`,
          );

        /*
         * Pedimos más candidatos de artistas para
         * poder seleccionar los mejores después.
         *
         * Antes sólo pedíamos 14 y esos lugares
         * podían llenarse con duplicados.
         */
        const artistSearchLimit = Math.min(
          Math.max(
            safeLimit * 3,
            30,
          ),
          50,
        );

        const [
          releaseData,
          artistData,
        ] = await Promise.all([
          queuedMusicBrainzFetch(
            `/release-group?query=${releaseQuery}&fmt=json&limit=${safeLimit}`,
          ),

          queuedMusicBrainzFetch(
            `/artist?query=${artistQuery}&fmt=json&limit=${artistSearchLimit}`,
          ),
        ]);

        const releaseGroups =
          releaseData[
            "release-groups"
          ] || [];

        const directReleases =
          rankReleases(
            uniqueById(
              releaseGroups,
            ).map(
              normalizeReleaseGroup,
            ),
            clean,
          );

        const artists = rankArtists(
          [
            ...(
              artistData.artists ||
              []
            ).map(normalizeArtist),

            ...artistsFromReleaseGroups(
              releaseGroups,
            ),
          ],
          clean,
          releaseGroups,
        );

        let releases =
          directReleases;

        const topArtist =
          artists[0];

        if (
          expandArtist &&
          shouldExpandArtistReleases(
            topArtist,
            directReleases,
            clean,
          )
        ) {
          const artistReleases =
            await getArtistReleases(
              topArtist.id,
              releaseLimit,
            );

          releases = rankReleases(
            [
              ...directReleases,
              ...artistReleases,
            ],
            clean,
          );
        }

        return {
          releases:
            releases.slice(
              0,
              safeLimit,
            ),

          /*
           * Para una búsqueda útil es mejor mostrar
           * ocho artistas relevantes que catorce
           * artistas repetidos o desconocidos.
           */
          artists:
            artists.slice(
              0,
              Math.min(
                safeLimit,
                8,
              ),
            ),
        };
      },
      CACHE_POLICY.search,
    );
  } catch (error) {
    const fallback =
      await localSearchFallback(
        clean,
        safeLimit,
      );

    if (
      fallback.releases.length ||
      fallback.artists.length
    ) {
      return fallback;
    }

    throw error;
  }
}

async function getRawReleaseGroup(id) {
  return persistentCached(
    `release-group:${id}`,
    () =>
      queuedMusicBrainzFetch(
        `/release-group/${encodeURIComponent(
          id,
        )}?inc=artist-credits+releases+tags&fmt=json`,
      ),
    CACHE_POLICY.release,
  );
}

export async function getReleaseGroup(
  id,
) {
  const group =
    await getRawReleaseGroup(id);

  const normalized =
    normalizeReleaseGroup(group);

  return {
    ...normalized,
    releaseCount:
      group.releases?.length || 0,
    tags: (group.tags || [])
      .sort(
        (a, b) =>
          Number(b.count || 0) -
          Number(a.count || 0),
      )
      .slice(0, 8)
      .map((tag) => tag.name),
  };
}

export async function getReleaseTracks(
  id,
) {
  return persistentCached(
    `release-tracks:v2:${id}`,
    async () => {
      const group =
        await getRawReleaseGroup(id);

      const releaseCandidates = [
        ...(group.releases || []),
      ]
        .sort(
          (left, right) =>
            Number(
              right.status ===
                "Official",
            ) -
            Number(
              left.status ===
                "Official",
            ),
        )
        .slice(0, 5);

      for (const candidate of releaseCandidates) {
        if (!candidate?.id) {
          continue;
        }

        try {
          const release =
            await queuedMusicBrainzFetch(
              `/release/${candidate.id}?inc=recordings+artist-credits&fmt=json`,
              {
                timeoutMs: 8_000,
                retries: 1,
              },
            );

          const tracks = (
            release.media || []
          ).flatMap((medium) =>
            (
              medium.tracks || []
            ).map((track) => ({
              id:
                track.recording?.id ||
                track.id,
              position:
                track.position,
              title:
                track.title ||
                track.recording
                  ?.title,
              length:
                track.length ||
                track.recording
                  ?.length ||
                null,
            })),
          );

          if (tracks.length) {
            return tracks;
          }
        } catch {
          /*
           * Algunas ediciones no incluyen
           * canciones; probamos una alternativa.
           */
        }
      }

      return [];
    },
    CACHE_POLICY.tracks,
  );
}

export async function getArtist(id) {
  return persistentCached(
    `artist:${id}`,
    async () => {
      const artist =
        await queuedMusicBrainzFetch(
          `/artist/${encodeURIComponent(
            id,
          )}?inc=tags+ratings&fmt=json`,
        );

      return {
        ...normalizeArtist(artist),
        genres: (
          artist.tags || []
        )
          .sort(
            (a, b) =>
              Number(b.count || 0) -
              Number(a.count || 0),
          )
          .slice(0, 6)
          .map(
            (tag) => tag.name,
          ),
        lifeSpan:
          artist["life-span"] ||
          null,
      };
    },
    CACHE_POLICY.artist,
  );
}

export async function getArtistReleases(
  id,
  limit = 100,
) {
  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 100,
      1,
    ),
    100,
  );

  return persistentCached(
    `artist-releases:${id}:${safeLimit}`,
    async () => {
      const data =
        await queuedMusicBrainzFetch(
          `/release-group?artist=${encodeURIComponent(
            id,
          )}&inc=artist-credits&fmt=json&limit=${safeLimit}`,
        );

      return sortReleasesNewestFirst(
        uniqueById(
          data["release-groups"] ||
            [],
        ).map(
          normalizeReleaseGroup,
        ),
      );
    },
    CACHE_POLICY.artistReleases,
  );
}

/**
 * Devuelve una lista breve de portadas candidatas para representar al artista.
 * La primera corresponde al lanzamiento más reciente con imagen disponible.
 * El frontend conserva varias opciones para poder probar la siguiente si una URL falla.
 */
export async function getArtistImages(id, limit = 8) {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 12);
  const releases = await getArtistReleases(id, 100);
  const images = [];
  const seen = new Set();

  for (const release of releases) {
    const image = String(release.image || "").trim();

    if (
      !image ||
      image.includes("cover-placeholder") ||
      seen.has(image)
    ) {
      continue;
    }

    seen.add(image);
    images.push(image);

    if (images.length >= safeLimit) break;
  }

  return { artistId: String(id), images };
}

function normalizeNewRelease(
  release = {},
) {
  return {
    ...normalizeReleaseGroup(release),
    primaryType:
      release["primary-type"] ||
      null,
  };
}

function isPriorityPopArtist(
  release = {},
) {
  const artist = normalizeText(
    release.artist || "",
  );

  return PRIORITY_POP_ARTISTS.some(
    (name) => {
      const priorityName =
        normalizeText(name);

      return (
        artist === priorityName ||
        artist.includes(
          priorityName,
        )
      );
    },
  );
}

function isAlbumRelease(
  release = {},
) {
  if (release.primaryType) {
    return (
      normalizeText(
        release.primaryType,
      ) === "album"
    );
  }

  return (
    release.releaseType === "Álbum"
  );
}

function curatedReleaseScore(
  release = {},
) {
  let score = 0;

  /*
   * Primero aparecen los artistas
   * más reconocibles.
   */
  if (
    isPriorityPopArtist(release)
  ) {
    score += 100;
  }

  /*
   * Dentro de cada grupo,
   * los álbumes aparecen antes.
   */
  if (isAlbumRelease(release)) {
    score += 20;
  }

  /*
   * Las compilaciones quedan
   * relegadas.
   */
  if (
    release.releaseType ===
    "Compilación"
  ) {
    score -= 30;
  }

  return score;
}

function normalizedFullReleaseDate(
  release = {},
) {
  const value = String(
    release.releaseDate || "",
  ).trim();

  /*
   * Para la sección de novedades sólo aceptamos
   * fechas completas. Un año o un año-mes no
   * permiten asegurar que el lanzamiento esté
   * realmente dentro de los últimos 15 días.
   */
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return "";
  }

  const parsed = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return value;
}

function isReleaseInsideDateRange(
  release = {},
  startDate,
  endDate,
) {
  const releaseDate =
    normalizedFullReleaseDate(release);

  if (!releaseDate) {
    return false;
  }

  return (
    releaseDate >= startDate &&
    releaseDate <= endDate
  );
}

function sortCuratedNewReleases(
  releases = [],
) {
  return [...releases].sort(
    (left, right) => {
      /*
       * La fecha es siempre el criterio principal.
       * El lanzamiento más reciente aparece primero.
       */
      const dateDifference =
        normalizedFullReleaseDate(
          right,
        ).localeCompare(
          normalizedFullReleaseDate(left),
        );

      if (dateDifference) {
        return dateDifference;
      }

      /*
       * Dentro de la misma fecha,
       * priorizamos álbumes.
       */
      const albumDifference =
        Number(isAlbumRelease(right)) -
        Number(isAlbumRelease(left));

      if (albumDifference) {
        return albumDifference;
      }

      /*
       * Si también coinciden en tipo,
       * priorizamos artistas reconocibles.
       */
      const artistDifference =
        Number(
          isPriorityPopArtist(right),
        ) -
        Number(
          isPriorityPopArtist(left),
        );

      if (artistDifference) {
        return artistDifference;
      }

      /*
       * Las compilaciones quedan detrás
       * de los lanzamientos regulares.
       */
      const compilationDifference =
        Number(
          left.releaseType ===
            "Compilación",
        ) -
        Number(
          right.releaseType ===
            "Compilación",
        );

      if (compilationDifference) {
        return compilationDifference;
      }

      return String(
        left.album ||
          left.title ||
          "",
      ).localeCompare(
        String(
          right.album ||
            right.title ||
            "",
        ),
        "es",
      );
    },
  );
}

/*
 * Selección editorial utilizada en Inicio.
 *
 * Se fijan únicamente artista, título y tipo.
 * La fecha, portada, identificador y demás datos
 * continúan obteniéndose de MusicBrainz.
 */
const CURATED_HOME_RELEASES = [
  {
    key: "love-sensation",
    title: "Love Sensation",
    queryArtist: "Madonna",
    expectedArtists: [
      "Madonna",
      "Kylie Minogue",
    ],
    releaseType: "Sencillo",
  },
  {
    key: "after-all",
    title: "After All",
    queryArtist: "Carly Rae Jepsen",
    expectedArtists: [
      "Carly Rae Jepsen",
    ],
    releaseType: "Sencillo",
  },
  {
    key: "music-fashion-film",
    title: "Music, Fashion, Film",
    queryArtist: "Charli xcx",
    expectedArtists: [
      "Charli xcx",
    ],
    releaseType: "Álbum",
  },
  {
    key: "crash-out",
    title: "Crash Out",
    queryArtist: "Tinashe",
    expectedArtists: [
      "Tinashe",
    ],
    releaseType: "Sencillo",
  },
  {
    key: "sauna",
    title: "Sauna",
    queryArtist: "Jessie Ware",
    expectedArtists: [
      "Jessie Ware",
    ],
    releaseType: "Sencillo",
  },
  {
    key: "reach-out",
    title: "Reach Out",
    queryArtist: "Victoria Monét",
    expectedArtists: [
      "Victoria Monét",
    ],
    releaseType: "Sencillo",
  },
  {
    key: "therapy-at-the-club",
    title: "Therapy at the Club",
    queryArtist: "FLO",
    expectedArtists: [
      "FLO",
    ],
    releaseType: "Sencillo",
  },
  {
    key: "petal-album",
    title: "petal",
    queryArtist: "Ariana Grande",
    expectedArtists: [
      "Ariana Grande",
    ],
    /*
     * Es obligatorio que sea el álbum.
     * El sencillo homónimo queda excluido.
     */
    releaseType: "Álbum",
  },
];

function matchesCuratedArtist(
  candidateArtist = "",
  expectedArtists = [],
) {
  const normalizedCandidate =
    normalizeText(candidateArtist);

  return expectedArtists.every(
    (artist) =>
      normalizedCandidate.includes(
        normalizeText(artist),
      ),
  );
}

function matchesCuratedRelease(
  release,
  definition,
) {
  if (
    normalizeText(
      release.album ||
        release.title ||
        "",
    ) !== normalizeText(definition.title)
  ) {
    return false;
  }

  if (
    release.releaseType !==
    definition.releaseType
  ) {
    return false;
  }

  return matchesCuratedArtist(
    release.artist,
    definition.expectedArtists,
  );
}

async function resolveCuratedHomeRelease(
  definition,
) {
  return persistentCached(
    `home-curated:v1:${definition.key}`,
    async () => {
      const safeTitle = definition.title
        .replace(/["\\]/g, " ")
        .trim();

      const safeArtist =
        definition.queryArtist
          .replace(/["\\]/g, " ")
          .trim();

      const query = encodeURIComponent(
        `releasegroup:"${safeTitle}" AND ` +
          `artist:"${safeArtist}"`,
      );

      const response =
        await queuedMusicBrainzFetch(
          `/release-group?query=${query}` +
            `&inc=artist-credits` +
            `&fmt=json` +
            `&limit=25`,
        );

      const candidates = uniqueById(
        response["release-groups"] || [],
      )
        .map(normalizeReleaseGroup)
        .filter((release) =>
          matchesCuratedRelease(
            release,
            definition,
          ),
        )
        .sort((left, right) => {
          const scoreDifference =
            Number(right.score || 0) -
            Number(left.score || 0);

          if (scoreDifference) {
            return scoreDifference;
          }

          return String(
            right.releaseDate || "",
          ).localeCompare(
            String(
              left.releaseDate || "",
            ),
          );
        });

      const selected = candidates[0];

      if (!selected) {
        throw new Error(
          `No se pudo identificar ${definition.title} de ${definition.queryArtist}.`,
        );
      }

      return selected;
    },
    CACHE_POLICY.newReleases,
  );
}

export async function getNewReleases(
  limit = 8,
) {
  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 8,
      1,
    ),
    CURATED_HOME_RELEASES.length,
  );

  /*
   * Cada lanzamiento se resuelve de forma
   * independiente. Si MusicBrainz falla para
   * uno de ellos, los demás siguen visibles.
   */
  const resolved = await Promise.allSettled(
    CURATED_HOME_RELEASES.map(
      resolveCuratedHomeRelease,
    ),
  );

  const releases = resolved
    .filter(
      (result) =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  /*
   * El orden final siempre depende de la fecha
   * real del catálogo: más reciente primero.
   */
  return sortCuratedNewReleases(
    uniqueReleases(releases),
  ).slice(0, safeLimit);
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
