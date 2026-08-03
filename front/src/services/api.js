const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

if (!configuredApiUrl && import.meta.env.PROD) {
  throw new Error(
    "Falta configurar VITE_API_URL con la dirección pública del backend.",
  );
}

const API_URL = configuredApiUrl || "http://localhost:3333/api";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(data?.message || "Error en la petición");
    error.status = response.status;
    error.details = data?.errors || [];
    throw error;
  }

  return data;
}
