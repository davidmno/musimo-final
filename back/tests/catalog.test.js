import test from "node:test";
import assert from "node:assert/strict";

import { catalogInternals, normalizeReleaseType } from "../services/catalog.services.js";

test("normaliza tipos sin tratamiento especial de EP", () => {
  assert.equal(normalizeReleaseType("Album", ["EP"]), "Álbum");
  assert.equal(normalizeReleaseType("Single", []), "Sencillo");
  assert.equal(normalizeReleaseType("Album", ["Compilation"]), "Compilación");
});

test("construye términos tolerantes a errores simples", () => {
  assert.equal(catalogInternals.fuzzyTerms("Radiohed Kid A"), "radiohed~ AND kid~ AND a~");
});

test("ordena lanzamientos del más reciente al más antiguo", () => {
  const releases = catalogInternals.sortReleasesNewestFirst([
    { album: "Anterior", releaseDate: "2020-01-01" },
    { album: "Actual", releaseDate: "2026-08-01" },
    { album: "Intermedio", year: "2024" },
  ]);
  assert.deepEqual(releases.map((release) => release.album), ["Actual", "Intermedio", "Anterior"]);
});


test("prioriza coincidencias de artista aunque no provengan de un lanzamiento", () => {
  const artists = catalogInternals.rankArtists([
    { id: "1", name: "Kylie Minogue", score: 96 },
    { id: "2", name: "Kylie", score: 70 },
    { id: "3", name: "The Kylie Band", score: 80 },
  ], "kylie minogue");
  assert.equal(artists[0].name, "Kylie Minogue");
});

test("expande la discografía cuando la búsqueda parece ser de artista", () => {
  assert.equal(
    catalogInternals.shouldExpandArtistReleases(
      { id: "artist-1", name: "Tame Impala", score: 100 },
      [{ album: "Currents", artist: "Tame Impala" }],
      "tame impala",
    ),
    true,
  );
});

test("no confunde un título exacto de una palabra con una búsqueda de artista", () => {
  assert.equal(
    catalogInternals.shouldExpandArtistReleases(
      { id: "artist-2", name: "Fever", score: 100 },
      [{ album: "Fever", artist: "Kylie Minogue" }],
      "fever",
    ),
    false,
  );
});
