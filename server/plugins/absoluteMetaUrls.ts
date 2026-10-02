import { siteOrigin } from "~/server/utils/siteOrigin";

// Link previews (Discord, Slack, iMessage, ...) ignore relative og:/twitter:
// image and url tags, so rewrite them to absolute URLs on the way out.
const META_URL_TAG =
  /(<meta\b[^>]*\bproperty="(?:og|twitter):(?:image|url)"[^>]*\bcontent=")(\/[^"]*)"/g;

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", (html, { event }) => {
    const origin = siteOrigin(event);

    html.head = html.head.map((chunk) =>
      chunk.replace(META_URL_TAG, (_, prefix, path) =>
        // Protocol-relative URLs ("//host/x") just need a scheme.
        path.startsWith("//")
          ? `${prefix}https:${path}"`
          : `${prefix}${origin}${path}"`
      )
    );
  });
});
