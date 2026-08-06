import * as yup from "yup";

export const reviewSchema = yup.object({
  catalogId: yup.string().nullable().default(null),
  artistId: yup.string().nullable().default(null),
  artist: yup.string().trim().required("El artista es obligatorio"),
  album: yup.string().trim().required("El lanzamiento es obligatorio"),
  text: yup.string().trim().required("La reseña es obligatoria").min(5).max(5000),
  image: yup.string().default(""),
  rating: yup.number().integer().min(0).max(5).default(0),
  significado: yup.array().of(yup.string().trim().max(40)).max(8).default([]),
  momento: yup.string().trim().max(1000).default(""),
  momentoVisibility: yup.string().oneOf(["public", "private"]).default("public"),
  releaseType: yup.string().default("Álbum"),
  releaseDate: yup.string().nullable().default(null),
  year: yup.mixed().nullable(),
});

export const commentSchema = yup.object({
  text: yup.string().trim().required("Escribí un comentario").min(1).max(1000),
});
