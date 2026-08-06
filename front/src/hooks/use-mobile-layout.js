import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 48rem)";

function matchesMobileLayout() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

export default function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(matchesMobileLayout);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = (event) => setIsMobile(event.matches);

    setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}
