export { COOKIE_NAME, ONE_YEAR_MS } from "./shared/const";

export const getApiBaseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, "");

/** In-app login page (native email/password + Google). */
export const getLoginUrl = () => "/login";

/** Backend-initiated Google OAuth entry point. */
export const getGoogleLoginUrl = () => `${getApiBaseUrl()}/api/auth/google`;
