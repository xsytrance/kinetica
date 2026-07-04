// Are we running on the user's OWN machine (localhost / desktop app) vs a
// hosted website? API keys are only ever entered when local, so a key never
// touches a site the user doesn't control.
const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
export const isLocal: boolean =
  /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname) ||
  /^tauri\.localhost$/.test(location.hostname) ||    // Tauri on Windows
  location.protocol === "file:" ||
  location.protocol === "tauri:" ||
  !!w.__TAURI__ || !!w.__TAURI_INTERNALS__;          // Tauri v2 desktop app

// Where users go to run it locally (so keys stay on their machine): the desktop
// app downloads (one-click, no Node) — with the source/README right there too.
export const RUN_LOCALLY_URL = "https://github.com/xsytrance/kinetica/releases/latest";
