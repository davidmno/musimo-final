import * as yup from "yup";

export const reviewSchema = yup.object({
  artist: yup.string().required("El artista es obligatorio"),
  album: yup.string().required("El álbum es obligatorio"),
  text: yup.string().required("La reseña es obligatoria").min(5),
  image: yup.string().default(""),
  rating: yup.number().min(1).max(5).nullable(),
  significado: yup.array().of(yup.string()).default([]),
  momento: yup.string().default(""),
  releaseType: yup.string().default("Álbum"),
  year: yup.number().nullable(),
});
