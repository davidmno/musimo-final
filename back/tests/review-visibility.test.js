import test from "node:test";
import assert from "node:assert/strict";

import { applyReviewVisibility } from "../utils/review-visibility.js";

const privateReview = {
  rating: 5,
  momento: "Un recuerdo privado",
  momentoVisibility: "private",
};

test("no expone valoración ni momento privado a terceros", () => {
  const visible = applyReviewVisibility(privateReview, { canManage: false });
  assert.equal("rating" in visible, false);
  assert.equal("momento" in visible, false);
  assert.equal("momentoVisibility" in visible, false);
  assert.equal("ratingPrivate" in visible, false);
  assert.equal("momentoPrivate" in visible, false);
});

test("mantiene valoración y momento para el autor", () => {
  const visible = applyReviewVisibility(privateReview, { canManage: true });
  assert.equal(visible.rating, 5);
  assert.equal(visible.momento, "Un recuerdo privado");
  assert.equal(visible.momentoVisibility, "private");
});

test("mantiene un momento público, pero nunca la valoración, para terceros", () => {
  const visible = applyReviewVisibility({ ...privateReview, momentoVisibility: "public" });
  assert.equal("rating" in visible, false);
  assert.equal(visible.momento, "Un recuerdo privado");
});
