// "Connect with OpenRouter" — OAuth PKCE. The user approves on openrouter.ai
// (never typing a key into Kinetica); OpenRouter hands back a scoped API key.
// A popup keeps the current session (the dropped song) intact; if the popup is
// blocked we fall back to a full-page redirect. The key lives only in this
// browser's localStorage.

const KEY_LS = "kinetica-openrouter-key";
const VERIFIER_LS = "kinetica-or-verifier"; // localStorage so the popup window can read it

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function randomVerifier(): string {
  const a = new Uint8Array(48);
  crypto.getRandomValues(a);
  return b64url(a);
}
async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

export const isConnected = () => !!localStorage.getItem(KEY_LS);
export function disconnect() {
  localStorage.removeItem(KEY_LS);
  window.dispatchEvent(new Event("kinetica-or-connected"));
}

/** Kick off the connect flow (popup, with redirect fallback). */
export async function startConnect(): Promise<void> {
  // Open the popup SYNCHRONOUSLY inside the click gesture (before any await),
  // then navigate it once the async PKCE challenge is computed — otherwise the
  // browser blocks the popup for not being gesture-initiated.
  const popup = window.open("about:blank", "openrouter-auth", "width=520,height=740");
  const verifier = randomVerifier();
  localStorage.setItem(VERIFIER_LS, verifier);
  const cb = location.origin + location.pathname;
  const url = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(cb)}&code_challenge=${await challenge(verifier)}&code_challenge_method=S256`;
  if (popup && !popup.closed) popup.location.href = url;
  else location.href = url; // popup blocked → full redirect (session reloads)
}

async function exchange(code: string, verifier: string): Promise<string> {
  const r = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
  });
  if (!r.ok) throw new Error(`OpenRouter auth ${r.status}`);
  const key = (await r.json())?.key;
  if (!key) throw new Error("OpenRouter returned no key");
  return key;
}

/** Run on every app load: if we returned from OpenRouter with a code, finish. */
export async function handleRedirectCode(): Promise<void> {
  const u = new URL(location.href);
  const code = u.searchParams.get("code");
  if (!code) return;
  const verifier = localStorage.getItem(VERIFIER_LS) || "";
  u.searchParams.delete("code");
  history.replaceState({}, "", u.toString());
  try {
    const key = await exchange(code, verifier);
    localStorage.removeItem(VERIFIER_LS);
    if (window.opener && window.opener !== window) {
      // we're the popup — hand the key to the app window and close
      window.opener.postMessage({ kineticaOpenrouterKey: key }, location.origin);
      window.close();
      return;
    }
    // redirect fallback — store + notify in this same window
    localStorage.setItem(KEY_LS, key);
    window.dispatchEvent(new Event("kinetica-or-connected"));
  } catch {
    localStorage.removeItem(VERIFIER_LS);
  }
}

/** Install the listener that receives the key from the auth popup. Call once. */
export function installAuthListener(): () => void {
  const onMsg = (e: MessageEvent) => {
    if (e.origin !== location.origin) return;
    const key = (e.data as { kineticaOpenrouterKey?: string })?.kineticaOpenrouterKey;
    if (typeof key === "string" && key) {
      localStorage.setItem(KEY_LS, key);
      window.dispatchEvent(new Event("kinetica-or-connected"));
    }
  };
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}
