import * as listsService from "../../services/lists.services.js";

function canManageList(list, usuario) {
  if (usuario?.rol === "admin") return true;

  const sameUserId =
    list.ownerId && String(list.ownerId) === String(usuario?._id);

  const legacyOwner =
    !list.ownerId &&
    (list.ownerName || list.owner) === usuario?.nombre;

  return Boolean(sameUserId || legacyOwner);
}

export async function getLists(req, res) {
  try {
    const lists = await listsService.getLists();
    res.json(lists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudieron cargar las listas" });
  }
}

export async function getListById(req, res) {
  try {
    const list = await listsService.getListById(req.params.id);

    if (!list) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo cargar la lista" });
  }
}

export async function createList(req, res) {
  try {
    const list = await listsService.createList({
      ...req.body,
      ownerId: req.usuario._id,
      ownerName: req.usuario.nombre,
    });

    res.status(201).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo crear la lista" });
  }
}

export async function updateList(req, res) {
  try {
    const existingList = await listsService.getListById(req.params.id);

    if (!existingList) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    if (!canManageList(existingList, req.usuario)) {
      return res.status(403).json({ message: "No podés editar esta lista" });
    }

    const list = await listsService.updateList(req.params.id, req.body, {
      ownerId: existingList.ownerId || req.usuario._id,
      ownerName:
        existingList.ownerName || existingList.owner || req.usuario.nombre,
    });

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo actualizar la lista" });
  }
}

export async function deleteList(req, res) {
  try {
    const existingList = await listsService.getListById(req.params.id);

    if (!existingList) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    if (!canManageList(existingList, req.usuario)) {
      return res.status(403).json({ message: "No podés eliminar esta lista" });
    }

    await listsService.deleteList(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo eliminar la lista" });
  }
}
