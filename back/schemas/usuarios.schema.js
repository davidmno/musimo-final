import * as yup from "yup";

const releaseItemSchema = yup.object({
  catalogId: yup.string().nullable().default(null),
  album: yup.string().required(),
  artist: yup.string().required(),
  artistId: yup.string().nullable().default(null),
  image: yup.string().default(""),
  year: yup.mixed().nullable(),
  releaseDate: yup.string().nullable().default(null),
  releaseType: yup.string().default("Álbum"),
});

const favoriteArtistSchema = yup.object({
  catalogId: yup.string().required(),
  name: yup.string().required(),
  image: yup.string().default(""),
});

export const registerSchema = yup.object({
  nombre: yup.string().trim().required("El nombre es obligatorio").min(2).max(80),
  email: yup.string().trim().lowercase().email("Email inválido").required(),
  password: yup.string().required("La contraseña es obligatoria").min(8),
});

export const loginSchema = yup.object({
  email: yup.string().trim().lowercase().email("Email inválido").required(),
  password: yup.string().required(),
});

export const profileSchema = yup.object({
  nombre: yup.string().trim().required("El nombre es obligatorio").min(2).max(80),
  email: yup.string().trim().lowercase().email("Email inválido").required("El email es obligatorio"),
  handle: yup
    .string()
    .trim()
    .lowercase()
    .matches(/^[a-z0-9._-]+$/, "Usá letras, números, puntos, guiones o guion bajo")
    .min(2)
    .max(30)
    .required("El usuario es obligatorio"),
  bio: yup.string().trim().max(280).default(""),
  avatar: yup.string().max(2).default(""),
  avatarImage: yup.string().max(1_500_000).default(""),
  favoriteArtists: yup.array().of(favoriteArtistSchema).max(5).default([]),
  top5: yup.array().of(releaseItemSchema).max(5).default([]),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().default(""),
  newPassword: yup.string().required("Ingresá una contraseña nueva").min(8),
});

export const forgotPasswordSchema = yup.object({
  email: yup.string().trim().lowercase().email("Email inválido").required(),
});

export const resetPasswordSchema = yup.object({
  token: yup.string().required(),
  password: yup.string().required("Ingresá una contraseña nueva").min(8),
});

export const roleSchema = yup.object({
  rol: yup.string().oneOf(["user", "admin"]).required(),
});

export const notificationSettingsSchema = yup.object({
  followedUserPosts: yup.boolean().default(false),
});
