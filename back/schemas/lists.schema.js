import * as yup from "yup";

const releaseItemSchema = yup.object({
  catalogId: yup.string().nullable().default(null),
  album: yup.string().required("El nombre del lanzamiento es obligatorio"),
  artist: yup.string().required("El artista es obligatorio"),
  artistId: yup.string().nullable().default(null),
  image: yup.string().default(""),
  year: yup.mixed().nullable(),
  releaseDate: yup.string().nullable().default(null),
  releaseType: yup.string().default("Álbum"),
});

export const listSchema = yup.object({
  title: yup.string().trim().required("El título es obligatorio").min(3).max(100),
  description: yup.string().trim().max(1000).default(""),
  visibility: yup.string().oneOf(["public", "private"]).default("public"),
  albums: yup
    .array()
    .of(releaseItemSchema)
    .min(1, "Agregá al menos un lanzamiento para guardar la lista")
    .max(100)
    .required("La lista debe incluir al menos un lanzamiento"),
});
