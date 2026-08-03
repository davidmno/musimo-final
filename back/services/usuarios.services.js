import dotenv from "dotenv";
dotenv.config();

import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { crearToken } from "./token.services.js";

const client = new MongoClient(process.env.DB_URL);
await client.connect();
const db = client.db(process.env.DB_NAME);
const usuariosCollection = db.collection("usuarios");
const reviewsCollection = db.collection("reviews");
const listsCollection = db.collection("lists");

function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function publicUser(usuario) {
  if (!usuario) return null;

  return {
    _id: usuario._id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol || "user",
    handle:
      usuario.handle ||
      usuario.nombre?.toLowerCase().replaceAll(" ", "") ||
      "",
    bio: usuario.bio || "",
    avatar:
      usuario.avatar || usuario.nombre?.slice(0, 1).toUpperCase() || "U",
    avatarImage: usuario.avatarImage || "",
    followers: usuario.followers || 0,
    following: usuario.following || 0,
    top5: usuario.top5 || [],
    createdAt: usuario.createdAt || null,
  };
}

export async function registerUser(usuario) {
  const email = usuario.email.trim().toLowerCase();
  const existe = await usuariosCollection.findOne({ email });

  if (existe) {
    throw new Error("El usuario ya existe");
  }

  const passwordHash = await bcrypt.hash(usuario.password, 10);
  const avatar = usuario.nombre.slice(0, 1).toUpperCase();

  const nuevoUsuario = {
    nombre: usuario.nombre.trim(),
    email,
    password: passwordHash,
    rol: "user",
    handle: usuario.nombre.toLowerCase().replaceAll(" ", ""),
    bio: "",
    avatar,
    avatarImage: "",
    followers: 0,
    following: 0,
    top5: [],
    createdAt: new Date(),
  };

  const result = await usuariosCollection.insertOne(nuevoUsuario);

  return publicUser({
    ...nuevoUsuario,
    _id: result.insertedId,
  });
}

export async function login(usuario) {
  const email = usuario.email.trim().toLowerCase();
  const existe = await usuariosCollection.findOne({ email });

  if (!existe) {
    throw new Error("Usuario o contraseña incorrectos");
  }

  const passwordValida = await bcrypt.compare(
    usuario.password,
    existe.password,
  );

  if (!passwordValida) {
    throw new Error("Usuario o contraseña incorrectos");
  }

  const usuarioPublico = publicUser(existe);

  const token = crearToken({
    _id: String(existe._id),
    nombre: existe.nombre,
    email: existe.email,
    rol: existe.rol || "user",
  });

  return {
    ...usuarioPublico,
    token,
  };
}

export async function getUsers() {
  const usuarios = await usuariosCollection
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return usuarios.map(publicUser);
}

export async function getUserById(id) {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const usuario = await usuariosCollection.findOne(
    { _id: objectId },
    { projection: { password: 0 } },
  );

  return publicUser(usuario);
}

export async function getCurrentUser(id) {
  const usuario = await getUserById(id);

  if (!usuario) {
    throw new Error("Usuario no encontrado");
  }

  return usuario;
}

export async function updateCurrentUserProfile(id, profileData) {
  const objectId = toObjectId(id);
  if (!objectId) throw new Error("Usuario no encontrado");

  const update = {
    nombre: profileData.nombre.trim(),
    handle: profileData.handle.trim(),
    bio: profileData.bio || "",
    avatar:
      profileData.avatar ||
      profileData.nombre?.slice(0, 1).toUpperCase() ||
      "U",
    avatarImage: profileData.avatarImage || "",
    top5: profileData.top5 || [],
    updatedAt: new Date(),
  };

  const result = await usuariosCollection.updateOne(
    { _id: objectId },
    { $set: update },
  );

  if (!result.matchedCount) {
    throw new Error("Usuario no encontrado");
  }

  const usuarioActualizado = await usuariosCollection.findOne({
    _id: objectId,
  });

  return publicUser(usuarioActualizado);
}

export async function updateUserRole(id, rol) {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const result = await usuariosCollection.updateOne(
    { _id: objectId },
    { $set: { rol, updatedAt: new Date() } },
  );

  if (!result.matchedCount) return null;
  return getUserById(id);
}

export async function deleteUser(id) {
  const objectId = toObjectId(id);
  if (!objectId) return false;

  const usuario = await usuariosCollection.findOne({ _id: objectId });
  if (!usuario) return false;

  await Promise.all([
    reviewsCollection.deleteMany({
      $or: [{ userId: String(objectId) }, { userId: objectId }],
    }),
    listsCollection.deleteMany({
      $or: [{ ownerId: String(objectId) }, { ownerId: objectId }],
    }),
  ]);

  const result = await usuariosCollection.deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}
