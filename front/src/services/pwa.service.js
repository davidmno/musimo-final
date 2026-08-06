const UPDATE_EVENT = "musimo:pwa-update";

function announceUpdate(registration) {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { registration } }));
}

export function registerPwa() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      if (registration.waiting) announceUpdate(registration);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            announceUpdate(registration);
          }
        });
      });

      const checkForUpdate = () => registration.update().catch(() => undefined);
      window.setInterval(checkForUpdate, 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
    } catch (error) {
      console.warn("No se pudo registrar la PWA de musimo.", error);
    }
  });
}

export { UPDATE_EVENT };
