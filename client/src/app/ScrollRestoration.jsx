import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Keep each history entry's position without changing the existing layout.
export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Product details are rendered as an overlay; keep the page behind it fixed.
    if (location.pathname.startsWith("/products/")) return undefined;
    const key = `darbys-scroll:${location.key}`;
    if (navigationType === "POP") {
      const saved = window.sessionStorage.getItem(key);
      if (saved) window.requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    } else if (!location.hash) {
      window.scrollTo(0, 0);
    }
    const save = () => window.sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener("pagehide", save);
    return () => { save(); window.removeEventListener("pagehide", save); };
  }, [location.hash, location.key, navigationType]);

  return null;
}
