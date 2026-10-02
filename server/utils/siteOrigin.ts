import type { H3Event } from "h3";

// The public origin of this instance, e.g. https://clocktracker.app. Set
// NUXT_PUBLIC_SITE_URL when the proxy in front of the app doesn't pass
// X-Forwarded-Host/Proto.
export function siteOrigin(event: H3Event) {
  return (
    process.env.NUXT_PUBLIC_SITE_URL ||
    getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  ).replace(/\/$/, "");
}
