export const PASSWORD_FLOW_COOKIE = "autoponte_password_flow";

export const PREVIEW_APP_URL =
  "https://autoponte-crm-git-codex-mission-control-cockpit-auto-ponte.vercel.app";

export function getPublicAppUrl() {
  const configured = process.env.AUTOPONTE_APP_URL?.trim().replace(/\/$/, "");
  if (!configured) return PREVIEW_APP_URL;

  const url = new URL(configured);
  if (url.protocol !== "https:" || url.hostname === "localhost") {
    throw new Error("AUTOPONTE_APP_URL deve usar a URL HTTPS do Preview.");
  }
  if (url.hostname === "autoponte-crm.vercel.app") {
    throw new Error("AUTOPONTE_APP_URL não pode apontar para Production neste ambiente.");
  }
  return url.origin;
}

export function getPasswordRedirectUrl() {
  return `${getPublicAppUrl()}/nova-senha`;
}
