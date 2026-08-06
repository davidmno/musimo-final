import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import { asObjectId, getDb, idString } from "../config/db.js";
import { crearToken } from "./token.services.js";
import { HttpError } from "../utils/http-error.js";
import { escapeRegExp, normalizeText, slugify } from "../utils/text.js";
import { applyReviewVisibility } from "../utils/review-visibility.js";

function tokenFor(user) {
  return crearToken({
    _id: idString(user._id),
    nombre: user.nombre,
    email: user.email,
    rol: user.rol || "user",
  });
}

function basePublicUser(user, counts = {}) {
  if (!user) return null;
  const fallbackHandle = slugify(user.nombre || "usuario").replaceAll("-", "");

  return {
    _id: user._id,
    nombre: user.nombre || "Usuario",
    handle: user.handle || fallbackHandle,
    bio: user.bio || "",
    avatar: user.avatar || user.nombre?.slice(0, 1).toUpperCase() || "U",
    avatarImage: user.avatarImage || "",
    favoriteArtists: user.favoriteArtists || [],
    top5: user.top5 || [],
    followers: counts.followers ?? user.followers ?? 0,
    following: counts.following ?? user.following ?? 0,
    createdAt: user.createdAt || null,
  };
}

async function countsFor(userId) {
  const db = await getDb();
  const id = idString(userId);
  const [followers, following] = await Promise.all([
    db.collection("follows").countDocuments({ targetId: id }),
    db.collection("follows").countDocuments({ followerId: id }),
  ]);
  return { followers, following };
}

async function uniqueHandle(seed, ignoredUserId = null) {
  const db = await getDb();
  const base = slugify(seed || "usuario").replaceAll("-", "").slice(0, 24) || "usuario";
  let candidate = base;
  let suffix = 1;

  while (
    await db.collection("usuarios").findOne({
      handle: candidate,
      ...(ignoredUserId ? { _id: { $ne: ignoredUserId } } : {}),
    })
  ) {
    suffix += 1;
    candidate = `${base.slice(0, 24 - String(suffix).length)}${suffix}`;
  }

  return candidate;
}

export async function getAuthUserById(id) {
  const objectId = asObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  return db.collection("usuarios").findOne({ _id: objectId });
}

export async function registerUser(input) {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();

  if (await db.collection("usuarios").findOne({ email })) {
    throw new HttpError(409, "Ya existe una cuenta con ese email");
  }

  const password = await bcrypt.hash(input.password, 12);
  const handle = await uniqueHandle(input.nombre);
  const user = {
    nombre: input.nombre.trim(),
    email,
    password,
    rol: "user",
    handle,
    bio: "",
    avatar: input.nombre.trim().slice(0, 1).toUpperCase(),
    avatarImage: "",
    favoriteArtists: [],
    top5: [],
    provider: "email",
    notificationSettings: { followedUserPosts: false },
    createdAt: new Date(),
    updatedAt: null,
  };

  const result = await db.collection("usuarios").insertOne(user);
  const created = { ...user, _id: result.insertedId };
  return { ...basePublicUser(created), email, rol: "user", token: tokenFor(created) };
}

export async function login(input) {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  const user = await db.collection("usuarios").findOne({ email });

  if (!user?.password || !(await bcrypt.compare(input.password, user.password))) {
    throw new HttpError(401, "Email o contraseña incorrectos");
  }

  const counts = await countsFor(user._id);
  return {
    ...basePublicUser(user, counts),
    email: user.email,
    rol: user.rol || "user",
    notificationSettings: user.notificationSettings || { followedUserPosts: false },
    token: tokenFor(user),
  };
}

export async function getCurrentUser(id) {
  const user = await getAuthUserById(id);
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return {
    ...basePublicUser(user, await countsFor(user._id)),
    email: user.email,
    rol: user.rol || "user",
    provider: user.provider || "email",
    hasPassword: Boolean(user.password),
    notificationSettings: user.notificationSettings || { followedUserPosts: false },
  };
}

export async function getPublicProfile(handle, viewerId = null) {
  const db = await getDb();
  const user = await db.collection("usuarios").findOne({
    handle: { $regex: `^${escapeRegExp(handle)}$`, $options: "i" },
  });
  if (!user) return null;

  const userId = idString(user._id);
  const [counts, isFollowing, reviews, lists] = await Promise.all([
    countsFor(user._id),
    viewerId
      ? db.collection("follows").findOne({ followerId: idString(viewerId), targetId: userId })
      : null,
    db
      .collection("reviews")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(24)
      .toArray(),
    db
      .collection("lists")
      .find({ ownerId: userId, visibility: { $ne: "private" } })
      .sort({ createdAt: -1 })
      .limit(24)
      .toArray(),
  ]);

  const isMe = viewerId ? idString(viewerId) === userId : false;

  return {
    ...basePublicUser(user, counts),
    isFollowing: Boolean(isFollowing),
    isMe,
    reviews: reviews.map((review) => applyReviewVisibility(review, { canManage: isMe })),
    lists,
  };
}

export async function updateCurrentUserProfile(id, input) {
  const objectId = asObjectId(id);
  if (!objectId) throw new HttpError(404, "Usuario no encontrado");
  const db = await getDb();
  const handle = normalizeText(input.handle).replace(/\s/g, "");
  const email = input.email.trim().toLowerCase();
  const conflict = await db.collection("usuarios").findOne({
    handle: { $regex: `^${escapeRegExp(handle)}$`, $options: "i" },
    _id: { $ne: objectId },
  });
  if (conflict) throw new HttpError(409, "Ese nombre de usuario ya está en uso");
  const emailConflict = await db.collection("usuarios").findOne({ email, _id: { $ne: objectId } });
  if (emailConflict) throw new HttpError(409, "Ese email ya está asociado a otra cuenta");

  const update = {
    nombre: input.nombre.trim(),
    email,
    handle,
    bio: input.bio || "",
    avatar: input.avatar || input.nombre.slice(0, 1).toUpperCase(),
    avatarImage: input.avatarImage || "",
    favoriteArtists: input.favoriteArtists || [],
    top5: input.top5 || [],
    updatedAt: new Date(),
  };
  const result = await db.collection("usuarios").findOneAndUpdate(
    { _id: objectId },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!result) throw new HttpError(404, "Usuario no encontrado");
  return getCurrentUser(id);
}

export async function searchUsers(query, limit = 12) {
  const clean = normalizeText(query);
  if (clean.length < 2) return [];
  const db = await getDb();
  const regex = new RegExp(escapeRegExp(clean), "i");
  const users = await db
    .collection("usuarios")
    .find({ $or: [{ nombre: regex }, { handle: regex }] })
    .limit(Math.min(Number(limit) || 12, 25))
    .toArray();
  return users.map((user) => basePublicUser(user));
}

export async function followUser(followerId, targetId) {
  const db = await getDb();
  const follower = idString(followerId);
  const target = idString(targetId);
  if (follower === target) throw new HttpError(400, "No podés seguirte a vos mismo");
  if (!(await getAuthUserById(target))) throw new HttpError(404, "Usuario no encontrado");

  const result = await db.collection("follows").updateOne(
    { followerId: follower, targetId: target },
    { $setOnInsert: { followerId: follower, targetId: target, createdAt: new Date() } },
    { upsert: true },
  );

  if (result.upsertedCount) {
    await db.collection("notifications").insertOne({
      recipientId: target,
      actorId: follower,
      type: "follow",
      read: false,
      createdAt: new Date(),
    });
  }
  return { following: true };
}

export async function unfollowUser(followerId, targetId) {
  const db = await getDb();
  await db.collection("follows").deleteOne({
    followerId: idString(followerId),
    targetId: idString(targetId),
  });
  return { following: false };
}

export async function listConnections(userId, type) {
  const db = await getDb();
  const id = idString(userId);
  const follows = await db
    .collection("follows")
    .find(type === "followers" ? { targetId: id } : { followerId: id })
    .toArray();
  const ids = follows.map((item) =>
    asObjectId(type === "followers" ? item.followerId : item.targetId),
  ).filter(Boolean);
  const users = await db.collection("usuarios").find({ _id: { $in: ids } }).toArray();
  return users.map((user) => basePublicUser(user));
}

export async function listFollowedArtists(userId) {
  const db = await getDb();
  const follows = await db.collection("artist_follows")
    .find({ userId: idString(userId) })
    .sort({ createdAt: -1 })
    .toArray();
  return follows.map(({ artist, createdAt }) => ({ ...artist, followedAt: createdAt }));
}

export async function changePassword(userId, currentPassword, newPassword) {
  const db = await getDb();
  const user = await getAuthUserById(userId);
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  if (user.password && !(await bcrypt.compare(currentPassword, user.password))) {
    throw new HttpError(400, "La contraseña actual no es correcta");
  }
  const password = await bcrypt.hash(newPassword, 12);
  await db.collection("usuarios").updateOne(
    { _id: user._id },
    { $set: { password, provider: user.provider || "email", updatedAt: new Date() } },
  );
  return { message: "Contraseña actualizada" };
}

async function sendResetEmail(email, resetUrl) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("Faltan BREVO_API_KEY o EMAIL_FROM.");
    return false;
  }

  const senderMatch = from.match(/^(.*?)\s*<(.+?)>$/);

  const sender = senderMatch
    ? {
        name: senderMatch[1].trim() || "musimo",
        email: senderMatch[2].trim(),
      }
    : {
        name: "musimo",
        email: from.trim(),
      };

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender,
        to: [{ email }],
        subject: "Recuperá tu contraseña de musimo",
        htmlContent: `
          <!doctype html>
          <html lang="es">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Recuperá tu contraseña de musimo</title>
            </head>

            <body
              style="
                margin: 0;
                padding: 0;
                background: #111110;
                font-family: Arial, Helvetica, sans-serif;
                color: #171513;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  width: 100%;
                  border-collapse: collapse;
                  background: #111110;
                "
              >
                <tr>
                  <td
                    align="center"
                    style="padding: 32px 16px;"
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      style="
                        width: 100%;
                        max-width: 560px;
                        border-collapse: collapse;
                        overflow: hidden;
                        border-radius: 16px;
                        background: #f2ece1;
                        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding: 28px 32px 22px;
                            background: #c0451b;
                            color: #fff8f5;
                          "
                        >
                          <p
                            style="
                              margin: 0 0 8px;
                              font-size: 12px;
                              font-weight: 700;
                              letter-spacing: 0.12em;
                              text-transform: uppercase;
                            "
                          >
                            Tu cuenta
                          </p>

                          <h1
                            style="
                              margin: 0;
                              font-size: 28px;
                              line-height: 1.15;
                              font-family: Georgia, 'Times New Roman', serif;
                            "
                          >
                            Recuperá tu contraseña
                          </h1>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 32px;">
                          <p
                            style="
                              margin: 0 0 18px;
                              font-size: 16px;
                              line-height: 1.6;
                            "
                          >
                            Recibimos un pedido para cambiar la contraseña de tu
                            cuenta de musimo.
                          </p>

                          <p
                            style="
                              margin: 0 0 26px;
                              font-size: 16px;
                              line-height: 1.6;
                            "
                          >
                            Usá el siguiente botón para elegir una contraseña nueva.
                          </p>

                          <table
                            role="presentation"
                            cellpadding="0"
                            cellspacing="0"
                            style="border-collapse: collapse;"
                          >
                            <tr>
                              <td
                                align="center"
                                style="
                                  border-radius: 10px;
                                  background: #c0451b;
                                "
                              >
                                <a
                                  href="${resetUrl}"
                                  style="
                                    display: inline-block;
                                    padding: 14px 22px;
                                    color: #ffffff;
                                    font-size: 15px;
                                    font-weight: 700;
                                    text-decoration: none;
                                  "
                                >
                                  Elegir una contraseña nueva
                                </a>
                              </td>
                            </tr>
                          </table>

                          <p
                            style="
                              margin: 26px 0 0;
                              color: #6f675f;
                              font-size: 13px;
                              line-height: 1.6;
                            "
                          >
                            Este enlace vence en una hora. Si no pediste este cambio,
                            podés ignorar este mensaje.
                          </p>

                          <p
                            style="
                              margin: 22px 0 0;
                              color: #6f675f;
                              font-size: 12px;
                              line-height: 1.6;
                              word-break: break-all;
                            "
                          >
                            Si el botón no funciona, copiá y pegá este enlace en tu navegador:
                            <br />
                            <a
                              href="${resetUrl}"
                              style="
                                color: #8d619f;
                                text-decoration: none;
                              "
                            >
                              ${resetUrl}
                            </a>
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding: 18px 32px;
                            border-top: 1px solid rgba(23, 21, 19, 0.12);
                            color: #7b746d;
                            font-size: 12px;
                          "
                        >
                          musimo · Música, significado y momentos
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
        textContent:
          `Recibimos un pedido para cambiar la contraseña de tu cuenta de musimo.\n\n` +
          `Elegí una contraseña nueva:\n${resetUrl}\n\n` +
          `El enlace vence en una hora.\n\n` +
          `Si no pediste este cambio, podés ignorar este mensaje.`,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await response.text();

    console.error(
      "Brevo no pudo enviar el email:",
      response.status,
      error,
    );

    throw new HttpError(
      502,
      "No se pudo enviar el email de recuperación",
    );
  }

  return true;
}

export async function requestPasswordReset(email) {
  const db = await getDb();
  const user = await db.collection("usuarios").findOne({ email: email.toLowerCase() });
  if (!user) return { message: "Si la cuenta existe, vas a recibir un email." };

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await db.collection("password_resets").deleteMany({ userId: idString(user._id) });
  await db.collection("password_resets").insertOne({
    userId: idString(user._id),
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
  });

  const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
  const resetUrl = `${frontend}/restablecer-contrasena?token=${token}`;
  const sent = await sendResetEmail(user.email, resetUrl);
  const response = { message: "Si la cuenta existe, vas a recibir un email." };
  if (!sent && process.env.NODE_ENV !== "production") response.resetUrl = resetUrl;
  return response;
}

export async function resetPassword(token, newPassword) {
  const db = await getDb();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const reset = await db.collection("password_resets").findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
  if (!reset) throw new HttpError(400, "El enlace venció o ya fue utilizado");

  const objectId = asObjectId(reset.userId);
  const password = await bcrypt.hash(newPassword, 12);
  await db.collection("usuarios").updateOne(
    { _id: objectId },
    { $set: { password, updatedAt: new Date() } },
  );
  await db.collection("password_resets").deleteMany({ userId: reset.userId });
  return { message: "Contraseña actualizada. Ya podés iniciar sesión." };
}

export async function updateNotificationSettings(userId, settings) {
  const db = await getDb();
  await db.collection("usuarios").updateOne(
    { _id: asObjectId(userId) },
    { $set: { notificationSettings: settings, updatedAt: new Date() } },
  );
  return getCurrentUser(userId);
}

export async function getUsers() {
  const db = await getDb();
  const users = await db.collection("usuarios").find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();
  return users.map((user) => ({ ...basePublicUser(user), email: user.email, rol: user.rol || "user" }));
}

export async function getUserById(id) {
  const user = await getAuthUserById(id);
  return user ? { ...basePublicUser(user), email: user.email, rol: user.rol || "user" } : null;
}

export async function updateUserRole(id, rol) {
  const db = await getDb();
  const result = await db.collection("usuarios").findOneAndUpdate(
    { _id: asObjectId(id) },
    { $set: { rol, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? getUserById(id) : null;
}

export async function deleteUser(id) {
  const db = await getDb();
  const objectId = asObjectId(id);
  if (!objectId) return false;
  const userId = idString(id);

  const userExists = await db.collection("usuarios").findOne(
    { _id: objectId },
    { projection: { _id: 1 } },
  );
  if (!userExists) return false;

  const [reviews, lists] = await Promise.all([
    db.collection("reviews").find({ userId }, { projection: { _id: 1 } }).toArray(),
    db.collection("lists").find({ ownerId: userId }, { projection: { _id: 1 } }).toArray(),
  ]);

  const reviewIds = reviews.map((item) => idString(item._id));
  const listIds = lists.map((item) => idString(item._id));
  const contentTargets = [
    ...(reviewIds.length ? [{ targetType: "review", targetId: { $in: reviewIds } }] : []),
    ...(listIds.length ? [{ targetType: "list", targetId: { $in: listIds } }] : []),
  ];
  const commentQuery = { $or: [{ userId }, ...contentTargets] };
  const relatedComments = await db.collection("comments")
    .find(commentQuery, { projection: { _id: 1 } })
    .toArray();
  const commentIds = relatedComments.map((item) => idString(item._id));
  const allTargets = [
    ...contentTargets,
    ...(commentIds.length ? [{ targetType: "comment", targetId: { $in: commentIds } }] : []),
  ];

  await Promise.all([
    db.collection("follows").deleteMany({ $or: [{ followerId: userId }, { targetId: userId }] }),
    db.collection("artist_follows").deleteMany({ userId }),
    db.collection("recent_searches").deleteMany({ userId }),
    db.collection("to_review").deleteMany({ userId }),
    db.collection("password_resets").deleteMany({ userId }),
    db.collection("comments").deleteMany(commentQuery),
    db.collection("resonances").deleteMany({ $or: [{ userId }, ...allTargets] }),
    db.collection("notifications").deleteMany({
      $or: [{ recipientId: userId }, { actorId: userId }, ...allTargets],
    }),
    db.collection("reviews").deleteMany({ userId }),
    db.collection("lists").deleteMany({ ownerId: userId }),
  ]);

  const result = await db.collection("usuarios").deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}
