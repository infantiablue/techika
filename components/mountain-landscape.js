"use client";

import { useEffect, useRef } from "react";

export function MountainLandscape() {
  const host = useRef(null);

  useEffect(() => {
    const element = host.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let generation = 0;
    let stop = () => {};

    // Load the renderer only when motion is wanted; the CSS landscape is always available.
    async function start() {
      const current = ++generation;
      stop();
      stop = () => {};
      if (reduced.matches) return;
      try {
        const { createLandscape } = await import("./mountain-scene");
        if (disposed || reduced.matches || current !== generation) return;
        stop = createLandscape(element);
      } catch {
        // Keep the original landscape if WebGL or the optional chunk is unavailable.
      }
    }

    start();
    reduced.addEventListener("change", start);
    return () => {
      disposed = true;
      reduced.removeEventListener("change", start);
      stop();
    };
  }, []);

  return <div ref={host} className="mountain-landscape" aria-hidden="true" />;
}
