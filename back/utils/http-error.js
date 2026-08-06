export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function assertFound(value, message = "Recurso no encontrado") {
  if (!value) throw new HttpError(404, message);
  return value;
}
