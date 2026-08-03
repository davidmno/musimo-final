import * as services from "../../services/usuarios.services.js";
import {
  loginSchema,
  profileSchema,
  registerSchema,
  roleSchema,
} from "../../schemas/usuarios.schema.js";

export async function registerUser(req, res) {
  try {
    const data = await registerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const usuario = await services.registerUser(data);
    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({
      message: "Datos inválidos",
      errors: error.errors || [error.message],
    });
  }
}

export async function login(req, res) {
  try {
    const data = await loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const usuario = await services.login(data);
    res.status(200).json(usuario);
  } catch (error) {
    res.status(400).json({
      message: "No se pudo iniciar sesión",
      errors: error.errors || [error.message],
    });
  }
}

export async function getUsers(req, res) {
  try {
    const usuarios = await services.getUsers();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error del servidor" });
  }
}

export async function getUserById(req, res) {
  try {
    const usuario = await services.getUserById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error del servidor" });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const usuario = await services.getCurrentUser(req.usuario._id);
    res.status(200).json(usuario);
  } catch (error) {
    res.status(404).json({
      message: error.message || "Usuario no encontrado",
    });
  }
}

export async function updateCurrentUserProfile(req, res) {
  try {
    const data = await profileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const usuario = await services.updateCurrentUserProfile(
      req.usuario._id,
      data,
    );

    res.status(200).json(usuario);
  } catch (error) {
    res.status(400).json({
      message: "No se pudo actualizar el perfil",
      errors: error.errors || [error.message],
    });
  }
}

export async function updateUserRole(req, res) {
  try {
    const data = await roleSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (
      String(req.params.id) === String(req.usuario._id) &&
      data.rol !== "admin"
    ) {
      return res
        .status(400)
        .json({ message: "No podés quitarte tu propio rol de administrador" });
    }

    const usuario = await services.updateUserRole(req.params.id, data.rol);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    res.status(400).json({
      message: "No se pudo actualizar el rol",
      errors: error.errors || [error.message],
    });
  }
}

export async function deleteUser(req, res) {
  try {
    if (String(req.params.id) === String(req.usuario._id)) {
      return res
        .status(400)
        .json({ message: "No podés eliminar tu propia cuenta administradora" });
    }

    const deleted = await services.deleteUser(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ deleted: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo eliminar el usuario" });
  }
}
