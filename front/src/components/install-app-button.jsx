import { useEffect, useState } from "react";
import AppIcon from "./app-icon";
import {
  getPwaInstallState,
  requestPwaInstall,
  subscribeToPwaInstallState,
} from "../services/pwa-install.service";

export default function InstallAppButton({
  className = "",
  label = "Instalar app",
}) {
  const [installState, setInstallState] = useState(getPwaInstallState);
  const [helpMode, setHelpMode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      subscribeToPwaInstallState(() => {
        setInstallState(getPwaInstallState());
      }),
    [],
  );

  if (installState.installed) return null;

  async function install() {
    setBusy(true);
    try {
      const result = await requestPwaInstall();
      if (result.status === "ios" || result.status === "manual") {
        setHelpMode(result.status);
      }
    } finally {
      setBusy(false);
      setInstallState(getPwaInstallState());
    }
  }

  const instructions =
    helpMode === "ios"
      ? "Abrí musimo en Safari, tocá Compartir y elegí “Agregar a pantalla de inicio”."
      : "Este navegador no ofreció la instalación automática. Abrí musimo en Chrome o Edge y elegí “Instalar aplicación” desde el menú.";

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={install}
        disabled={busy}
        aria-busy={busy}
      >
        <AppIcon name="download" size={17} />
        {busy ? "Preparando…" : label}
      </button>

      {helpMode && (
        <div
          className="pwa-install-help-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHelpMode("");
          }}
        >
          <section
            className="pwa-install-help"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-help-title"
          >
            <button
              className="pwa-install-help-close"
              type="button"
              onClick={() => setHelpMode("")}
              aria-label="Cerrar instrucciones"
            >
              <AppIcon name="x" size={18} />
            </button>
            <p className="eyebrow">Instalar musimo</p>
            <h2 id="pwa-install-help-title">Llevá la app a tu pantalla de inicio</h2>
            <p>{instructions}</p>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setHelpMode("")}
            >
              Entendido
            </button>
          </section>
        </div>
      )}
    </>
  );
}
