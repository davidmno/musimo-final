import * as yup from "yup";

const top5ItemSchema = yup.object({
  album: yup.string().required(),
  artist: yup.string().required(),
  image: yup.string().default(""),
  year: yup.mixed().nullable(),
  type: yup.string().default("Álbum"),
});

export const registerSchema = yup.object({
  nombre: yup.string().required("El nombre es obligatorio").min(2),

  email: yup
    .string()
    .email("Email inválido")
    .required("El email es obligatorio"),

  password: yup.string().required("La contraseña es obligatoria").min(6),
});

export const loginSchema = yup.object({
  email: yup.string().email("Email inválido").required(),

  password: yup.string().required(),
});

export const profileSchema = yup.object({
  nombre: yup.string().required("El nombre es obligatorio").min(2),
  handle: yup.string().required("El usuario es obligatorio").min(2),
  bio: yup.string().max(280).default(""),
  avatar: yup.string().max(2).default(""),
  avatarImage: yup.string().default(""),
  top5: yup.array().of(top5ItemSchema).max(5).default([]),
});

export const roleSchema = yup.object({
  rol: yup.string().oneOf(["user", "admin"]).required("El rol es obligatorio"),
});
