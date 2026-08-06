import * as services from "../../services/usuarios.services.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  notificationSettingsSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  roleSchema,
} from "../../schemas/usuarios.schema.js";

async function validate(schema, body) {
  return schema.validate(body, { abortEarly: false, stripUnknown: true });
}

export async function registerUser(req, res, next) {
  try {
    res
      .status(201)
      .json(
        await services.registerUser(await validate(registerSchema, req.body)),
      );
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    res.json(await services.login(await validate(loginSchema, req.body)));
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const data = await validate(forgotPasswordSchema, req.body);
    res.json(await services.requestPasswordReset(data.email));
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const data = await validate(resetPasswordSchema, req.body);
    res.json(await services.resetPassword(data.token, data.password));
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const data = await validate(changePasswordSchema, req.body);
    res.json(
      await services.changePassword(
        req.usuario._id,
        data.currentPassword,
        data.newPassword,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    res.json(await services.getCurrentUser(req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function getPublicProfile(req, res, next) {
  try {
    const profile = await services.getPublicProfile(
      req.params.handle,
      req.usuario?._id,
    );
    if (!profile)
      return res.status(404).json({ message: "Perfil no encontrado" });
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentUserProfile(req, res, next) {
  try {
    res.json(
      await services.updateCurrentUserProfile(
        req.usuario._id,
        await validate(profileSchema, req.body),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function searchUsers(req, res, next) {
  try {
    res.json(await services.searchUsers(req.query.q || "", req.query.limit));
  } catch (error) {
    next(error);
  }
}

export async function followUser(req, res, next) {
  try {
    res.json(await services.followUser(req.usuario._id, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function unfollowUser(req, res, next) {
  try {
    res.json(await services.unfollowUser(req.usuario._id, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function getConnections(req, res, next) {
  try {
    if (!["followers", "following"].includes(req.params.type)) {
      return res.status(400).json({ message: "Tipo de conexión inválido" });
    }
    res.json(await services.listConnections(req.params.id, req.params.type));
  } catch (error) {
    next(error);
  }
}

export async function getFollowedArtists(req, res, next) {
  try {
    res.json(await services.listFollowedArtists(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function updateNotificationSettings(req, res, next) {
  try {
    const data = await validate(notificationSettingsSchema, req.body);
    res.json(await services.updateNotificationSettings(req.usuario._id, data));
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    res.json(await services.getUsers());
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await services.getUserById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const data = await validate(roleSchema, req.body);
    if (
      String(req.params.id) === String(req.usuario._id) &&
      data.rol !== "admin"
    ) {
      return res
        .status(400)
        .json({ message: "No podés quitarte tu propio rol" });
    }
    const user = await services.updateUserRole(req.params.id, data.rol);
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    if (String(req.params.id) === String(req.usuario._id)) {
      return res
        .status(400)
        .json({ message: "No podés eliminar tu propia cuenta administradora" });
    }
    if (!(await services.deleteUser(req.params.id))) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ deleted: req.params.id });
  } catch (error) {
    next(error);
  }
}
