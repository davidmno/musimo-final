import { useEffect, useState } from "react";
import { UPDATE_EVENT } from "../services/pwa.service";

export default function PwaUpdateNotice() {
  const [registration, setRegistration] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    function handleUpdate(event) {
      setRegistration(event.detail?.registration || null);
    }

    window.addEventListener(UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(UPDATE_EVENT, handleUpdate);
  }, []);

  if (!registration) return null;

  function applyUpdate() {
    const waitingWorker = registration.waiting;
    if (!waitingWorker) {
      registration.update().catch(() => undefined);
      return;
    }

    setUpdating(true);
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <aside className="pwa-update-notice" role="status" aria-live="polite">
      <div>
        <strong>Hay una nueva versión de musimo.</strong>
        <p>Actualizá para recibir las últimas mejoras sin perder tu sesión.</p>
      </div>
      <div className="pwa-update-actions">
        <button className="btn btn-primary btn-sm" type="button" onClick={applyUpdate} disabled={updating} aria-busy={updating}>
          {updating ? "Actualizando…" : "Actualizar ahora"}
        </button>
        <button className="btn btn-tertiary btn-sm" type="button" onClick={() => setRegistration(null)} disabled={updating}>
          Más tarde
        </button>
      </div>
    </aside>
  );
}
