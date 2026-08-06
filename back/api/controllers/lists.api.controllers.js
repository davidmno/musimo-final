import * as lists from "../../services/lists.services.js";
import * as community from "../../services/community.services.js";
import { listSchema } from "../../schemas/lists.schema.js";
import { commentSchema } from "../../schemas/reviews.schema.js";
import { getUserById } from "../../services/usuarios.services.js";

function canManage(list, user) {
  return Boolean(
    user &&
    (user.rol === "admin" ||
      (list.ownerId && String(list.ownerId) === String(user._id)) ||
      (!list.ownerId && (list.ownerName || list.owner) === user.nombre)),
  );
}

async function visible(list, user) {
  if (!list) return null;
  const manager = canManage(list, user);
  if (list.visibility === "private" && !manager) return null;
  const owner = list.ownerId ? await getUserById(list.ownerId) : null;
  return {
    ...list,
    visibility: list.visibility || "public",
    canManage: manager,
    resonatedByMe: await community.hasResonated(user?._id, "list", list._id),
    author: owner
      ? {
          _id: owner._id,
          nombre: owner.nombre,
          handle: owner.handle,
          avatar: owner.avatar,
          avatarImage: owner.avatarImage || "",
        }
      : null,
  };
}

export async function getLists(req, res, next) {
  try {
    const data = await lists.getLists(req.query, req.usuario?._id);
    res.json(await Promise.all(data.map((list) => visible(list, req.usuario))));
  } catch (error) {
    next(error);
  }
}

export async function getListById(req, res, next) {
  try {
    const list = await visible(
      await lists.getListById(req.params.id),
      req.usuario,
    );
    if (!list) return res.status(404).json({ message: "Lista no encontrada" });
    res.json(list);
  } catch (error) {
    next(error);
  }
}

export async function createList(req, res, next) {
  try {
    const data = await listSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const list = await lists.createList({
      ...data,
      ownerId: req.usuario._id,
      ownerName: req.usuario.nombre,
      ownerHandle: req.usuario.handle,
    });
    res.status(201).json(await visible(list, req.usuario));
  } catch (error) {
    next(error);
  }
}

export async function updateList(req, res, next) {
  try {
    const current = await lists.getListById(req.params.id);
    if (!current)
      return res.status(404).json({ message: "Lista no encontrada" });
    if (!canManage(current, req.usuario))
      return res.status(403).json({ message: "No podés editar esta lista" });
    const data = await listSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const list = await lists.updateList(req.params.id, data, {
      ownerId: current.ownerId || req.usuario._id,
      ownerName: current.ownerName || current.owner || req.usuario.nombre,
      ownerHandle: current.ownerHandle || req.usuario.handle,
    });
    res.json(await visible(list, req.usuario));
  } catch (error) {
    next(error);
  }
}

export async function deleteList(req, res, next) {
  try {
    const current = await lists.getListById(req.params.id);
    if (!current)
      return res.status(404).json({ message: "Lista no encontrada" });
    if (!canManage(current, req.usuario))
      return res.status(403).json({ message: "No podés eliminar esta lista" });
    await lists.deleteList(req.params.id);
    await community.deleteRelated("list", req.params.id);
    res.json({ deleted: req.params.id });
  } catch (error) {
    next(error);
  }
}

export async function getComments(req, res, next) {
  try {
    const current = await lists.getListById(req.params.id);
    if (
      !current ||
      (current.visibility === "private" && !canManage(current, req.usuario))
    ) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }
    res.json(
      await community.listComments("list", req.params.id, req.usuario?._id),
    );
  } catch (error) {
    next(error);
  }
}

export async function addComment(req, res, next) {
  try {
    const current = await lists.getListById(req.params.id);
    if (
      !current ||
      (current.visibility === "private" && !canManage(current, req.usuario))
    ) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }
    const data = await commentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    res.status(201).json(
      await community.addComment({
        userId: req.usuario._id,
        targetType: "list",
        targetId: current._id,
        authorId: current.ownerId,
        text: data.text,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function resonate(req, res, next) {
  try {
    const current = await lists.getListById(req.params.id);
    if (
      !current ||
      (current.visibility === "private" && !canManage(current, req.usuario))
    ) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }
    res.json(
      await community.toggleResonance(
        req.usuario._id,
        "list",
        current._id,
        current.ownerId,
      ),
    );
  } catch (error) {
    next(error);
  }
}
