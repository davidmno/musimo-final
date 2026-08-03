function normalize(value = "") {
  return value.trim().toLowerCase();
}

function mapReleaseType(type = "") {
  const normalizedType = normalize(type);

  if (normalizedType === "ep") return "EP";
  if (normalizedType === "single") return "Sencillo";
  if (normalizedType === "album") return "Álbum";

  return "Álbum";
}

export async function getReleaseMetadata(title, artist) {
  const query = [
    `releasegroup:"${title}"`,
    `artist:"${artist}"`,
  ].join(" AND ");

  const params = new URLSearchParams({
    query,
    fmt: "json",
    limit: "5",
  });

  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/release-group?${params.toString()}`,
    );

    if (!response.ok) {
      return {
        releaseType: "Álbum",
        year: "",
      };
    }

    const data = await response.json();
    const releases = data["release-groups"] || [];

    const bestMatch =
      releases.find(
        (release) =>
          normalize(release.title) === normalize(title) &&
          release["primary-type"],
      ) || releases[0];

    if (!bestMatch) {
      return {
        releaseType: "Álbum",
        year: "",
      };
    }

    return {
      releaseType: mapReleaseType(bestMatch["primary-type"]),
      year: bestMatch["first-release-date"]?.slice(0, 4) || "",
    };
  } catch {
    return {
      releaseType: "Álbum",
      year: "",
    };
  }
}
