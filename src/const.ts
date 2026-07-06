export { COOKIE_NAME, ONE_YEAR_MS } from "./shared/const";

export const getApiBaseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, "");

function isValidHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasOAuthLoginConfig() {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();

  return isValidHttpUrl(oauthPortalUrl) && Boolean(appId);
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();
  const redirectUri = `${getApiBaseUrl()}/api/oauth/callback`;
  const state = globalThis.btoa(redirectUri);

  if (!isValidHttpUrl(oauthPortalUrl) || !appId) {
    return "/";
  }

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
