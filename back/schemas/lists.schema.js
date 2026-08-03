import * as yup from "yup";

const albumItemSchema = yup.object({
  album: yup.string().required("El nombre del álbum es obligatorio"),
  artist: yup.string().required("El artista es obligatorio"),
  image: yup.string().default(""),
  year: yup.mixed().nullable(),
  type: yup.string().default("Álbum"),
});

export const listSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required("El título es obligatorio")
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(100, "El título no puede superar los 100 caracteres"),
  description: yup
    .string()
    .trim()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .default(""),
  albums: yup.array().of(albumItemSchema).max(50).default([]),
});
