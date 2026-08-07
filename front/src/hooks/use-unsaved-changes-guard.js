import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const NAVIGATION_EVENT = "musimo:request-navigation";

export function requestGuardedNavigation(action) {
  const event = new CustomEvent(NAVIGATION_EVENT, {
    cancelable: true,
    detail: { proceed: action },
  });

  if (window.dispatchEvent(event)) {
    action();
  }
}

export default function useUnsavedChangesGuard(dirty) {
  const navigate = useNavigate();
  const pendingAction = useRef(null);
  const [navigationPending, setNavigationPending] =
    useState(false);

  useEffect(() => {
    if (!dirty) return undefined;

    function queueNavigation(action) {
      pendingAction.current = action;
      setNavigationPending(true);
    }

    function handleNavigationRequest(event) {
      const proceed = event.detail?.proceed;

      if (typeof proceed !== "function") return;

      event.preventDefault();
      queueNavigation(proceed);
    }

    function handleLinkClick(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor =
        event.target.closest?.("a[href]");

      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(
        anchor.href,
        window.location.href,
      );

      if (
        destination.origin !==
        window.location.origin
      ) {
        return;
      }

      const current =
        window.location.pathname +
        window.location.search +
        window.location.hash;

      const next =
        destination.pathname +
        destination.search +
        destination.hash;

      if (current === next) return;

      event.preventDefault();

      queueNavigation(() => {
        navigate(next);
      });
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      NAVIGATION_EVENT,
      handleNavigationRequest,
    );

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    document.addEventListener(
      "click",
      handleLinkClick,
      true,
    );

    return () => {
      window.removeEventListener(
        NAVIGATION_EVENT,
        handleNavigationRequest,
      );

      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );

      document.removeEventListener(
        "click",
        handleLinkClick,
        true,
      );
    };
  }, [dirty, navigate]);

  function cancelNavigation() {
    pendingAction.current = null;
    setNavigationPending(false);
  }

  function confirmNavigation() {
    const action = pendingAction.current;

    pendingAction.current = null;
    setNavigationPending(false);

    action?.();
  }

  return {
    navigationPending,
    cancelNavigation,
    confirmNavigation,
  };
}
