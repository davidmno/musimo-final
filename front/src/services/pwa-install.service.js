const INSTALL_STATE_EVENT = "musimo:pwa-install-state";
let deferredPrompt = null;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  const platform = window.navigator.userAgentData?.platform || window.navigator.platform || "";
  const userAgent = window.navigator.userAgent || "";
  const touchMac = platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(userAgent) || touchMac;
}

function announceState() {
  window.dispatchEvent(new CustomEvent(INSTALL_STATE_EVENT));
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    announceState();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    announceState();
  });

  window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", announceState);
}

export function getPwaInstallState() {
  if (typeof window === "undefined") {
    return { installed: false, canPrompt: false, isIos: false };
  }

  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferredPrompt),
    isIos: isIosDevice(),
  };
}

export function subscribeToPwaInstallState(callback) {
  window.addEventListener(INSTALL_STATE_EVENT, callback);
  return () => window.removeEventListener(INSTALL_STATE_EVENT, callback);
}

export async function requestPwaInstall() {
  const state = getPwaInstallState();
  if (state.installed) return { status: "installed" };

  if (!deferredPrompt) {
    return { status: state.isIos ? "ios" : "manual" };
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  announceState();

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return { status: choice?.outcome === "accepted" ? "accepted" : "dismissed" };
}
