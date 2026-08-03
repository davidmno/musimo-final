const POP_ARTIST_ALLOWLIST = [
  "Jessie Ware",
  "Olivia Rodrigo",
  "Bebe Rexha",
  "Niall Horan",
  "Lizzo",
  "Hayley Kiyoko",
  "Johnny Orlando",
  "Kylie Minogue",
  "Dua Lipa",
  "Sabrina Carpenter",
  "Chappell Roan",
  "Lady Gaga",
  "Ariana Grande",
  "Taylor Swift",
  "Charli XCX",
  "Tate McRae",
  "Miley Cyrus",
  "Troye Sivan",
  "Rina Sawayama",
  "Carly Rae Jepsen",
];

const FALLBACK_POP_RELEASES = [
  {
    album: "Superbloom",
    artist: "Jessie Ware",
    image: "/images/covers/superbloom.jpg",
    year: "2026",
    type: "Álbum",
  },
  {
    album: "Dirty Blonde",
    artist: "Bebe Rexha",
    image: "/images/covers/dirty-blonde.jpg",
    year: "2026",
    type: "Álbum",
  },
  {
    album: "Dinner Party",
    artist: "Niall Horan",
    image: "/images/covers/dinner-party.jpg",
    year: "2026",
    type: "Álbum",
  },
  {
    album: "BITCH",
    artist: "Lizzo",
    image: "/images/covers/bitch.jpg",
    year: "2026",
    type: "Álbum",
  },
  {
    album: "girls like girls the album",
    artist: "Hayley Kiyoko",
    image: "/images/covers/girls-like-girls.jpg",
    year: "2026",
    type: "Álbum",
  },
  {
    album: "Songs for Young Lovers",
    artist: "Johnny Orlando",
    image: "/images/covers/songs-for-young%20lovers.jpg",
    year: "2026",
    type: "Álbum",
  },
];

function getLastMonthRange() {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);

  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);

  const start = startDate.toISOString().slice(0, 10);

  return { start, end };
}

function normalize(value = "") {
  return value.trim().toLowerCase();
}

function isKnownPopArtist(artist = "") {
  return POP_ARTIST_ALLOWLIST.some((allowedArtist) =>
    normalize(artist).includes(normalize(allowedArtist)),
  );
}

async function getCoverImage(id) {
  try {
    const response = await fetch(
      `https://coverartarchive.org/release-group/${id}`,
    );

    if (!response.ok) return "/images/cover-placeholder.png";

    const data = await response.json();

    const front = data.images?.find((image) => image.front) || data.images?.[0];

    return (
      front?.thumbnails?.large ||
      front?.thumbnails?.small ||
      front?.image ||
      "/images/cover-placeholder.png"
    );
  } catch {
    return "/images/cover-placeholder.png";
  }
}

function normalizeRelease(release, image) {
  const artist =
    release["artist-credit"]?.map((credit) => credit.name).join(", ") ||
    "Artista desconocido";

  return {
    album: release.title,
    artist,
    image,
    year: release.date?.slice(0, 4) || "",
    type: release["primary-type"] || "Álbum",
    date: release.date || "",
    id: release.id,
  };
}

export async function getRecentMusicReleases() {
  const { start, end } = getLastMonthRange();

  const query = [
    "tag:pop",
    "type:album",
    "status:official",
    `date:[${start} TO ${end}]`,
  ].join(" AND ");

  const params = new URLSearchParams({
    query,
    fmt: "json",
    limit: "50",
  });

  const response = await fetch(
    `https://musicbrainz.org/ws/2/release-group?${params.toString()}`,
  );

  if (!response.ok) {
    return FALLBACK_POP_RELEASES;
  }

  const data = await response.json();
  const releases = data["release-groups"] || [];

  const filtered = releases
    .filter((release) => release.title && release.id)
    .filter((release) => {
      const artist =
        release["artist-credit"]?.map((credit) => credit.name).join(", ") ||
        "";

      return isKnownPopArtist(artist);
    })
    .slice(0, 6);

  if (filtered.length === 0) {
    return FALLBACK_POP_RELEASES;
  }

  const withCovers = await Promise.all(
    filtered.map(async (release) => {
      const image = await getCoverImage(release.id);
      return normalizeRelease(release, image);
    }),
  );

  return withCovers.slice(0, 6);
}
