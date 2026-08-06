import test from "node:test";
import assert from "node:assert/strict";

import { normalizeText, releaseKey, slugify } from "../utils/text.js";

test("normaliza texto y enlaces amigables", () => {
  assert.equal(normalizeText("  Música   Única "), "musica unica");
  assert.equal(slugify("Björk & Friends"), "bjork-and-friends");
});

test("prioriza el identificador neutral de catálogo", () => {
  assert.equal(releaseKey({ catalogId: "abc", artist: "A", album: "B" }), "abc");
  assert.equal(releaseKey({ artist: "A", album: "B" }), "a|b");
});
