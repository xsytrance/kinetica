// Are we running on the user's OWN machine (localhost / desktop app) vs a
// hosted website? API keys are only ever entered when local, so a key never
// touches a site the user doesn't control.
export const isLocal: boolean =
  /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname) ||
  location.protocol === "file:" ||
  location.protocol === "tauri:" ||
  !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;

// Where users go to run it locally (so keys stay on their machine).
export const RUN_LOCALLY_URL = "https://github.com/xsytrance/kinetica#run-it-locally-for-ai-features";
