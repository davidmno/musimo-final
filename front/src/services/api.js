const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

if (!configuredApiUrl && import.meta.env.PROD) {
  throw new Error(
    "Falta configurar VITE_API_URL con la dirección pública del backend.",
  );
}

const API_URL = configuredApiUrl || "http://localhost:3333/api";
const REQUEST_TIMEOUT = 15_000;

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT);
  const externalSignal = options.signal;

  function abortFromExternalSignal() {
    controller.abort(externalSignal?.reason);
  }

  if (externalSignal) {
    if (externalSignal.aborted) abortFromExternalSignal();
    else externalSignal.addEventListener("abort", abortFromExternalSignal, { once: true });
  }

  const headers = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      const error = new Error(data?.message || "No se pudo completar la solicitud.");
      error.status = response.status;
      error.details = data?.errors || [];
      error.code = data?.code || null;
      error.retryAfter = data?.retryAfter || null;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const timedOut =
        controller.signal.reason === "timeout";

      if (timedOut) {
        throw new Error(
          "La conexión tardó demasiado. Probá nuevamente.",
          { cause: error },
        );
      }

      /*
       * Una búsqueda anterior puede cancelarse
       * normalmente cuando el usuario sigue escribiendo.
       * Conservamos AbortError para que la interfaz
       * pueda ignorarlo sin mostrar una alerta.
       */
      const abortError = new Error(
        "Solicitud cancelada.",
        { cause: error },
      );

      abortError.name = "AbortError";
      throw abortError;
    }

    if (error instanceof TypeError) {
      throw new Error(
        "No pudimos conectar con musimo. Revisá tu conexión e intentá nuevamente.",
        { cause: error },
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener?.("abort", abortFromExternalSignal);
  }
}

export function warmApi() {
  return fetch(`${API_URL}/health`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  }).catch(() => null);
}
