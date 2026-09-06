#!/usr/bin/env bash
# Run with a local server: bash scripts/check-mountain.sh [http://127.0.0.1:3000/]
# Requires the agent-browser CLI used for visual verification.
set -eu
browser() { agent-browser --session techika-mountain-check "$@"; }
trap 'browser close >/dev/null 2>&1 || true' EXIT
browser set media light
browser open "${1:-http://127.0.0.1:3000/}"
browser wait '.mountain-landscape[data-ready="true"]'
browser eval '(async () => {
  const canvas = document.querySelector(".mountain-landscape canvas");
  const gl = canvas.getContext("webgl2");
  let draws = 0;
  const draw = gl.drawElements.bind(gl);
  gl.drawElements = (...args) => { draws++; return draw(...args); };
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(r => setTimeout(r, 1800));
  if (!draws) throw new Error("Scroll did not render");
  const settled = draws;
  await new Promise(r => setTimeout(r, 250));
  if (draws !== settled) throw new Error("Renderer did not stop while idle");
  gl.getExtension("WEBGL_lose_context").loseContext();
  await new Promise(r => setTimeout(r, 100));
  if (document.querySelector(".mountain-landscape canvas")) throw new Error("Context loss did not release canvas");
  if (+getComputedStyle(document.querySelector(".home"), "::before").opacity <= 0) throw new Error("Static fallback hidden");
  return "Scroll, idle rendering, and context-loss fallback passed";
})()'
browser set media light reduced-motion
browser reload
browser wait 500
browser eval 'if (document.querySelector(".mountain-landscape canvas") || performance.getEntriesByType("resource").some(r => r.name.includes("/assets/mountains/"))) throw new Error("Reduced motion loaded the scene"); "Reduced-motion fallback passed"'
