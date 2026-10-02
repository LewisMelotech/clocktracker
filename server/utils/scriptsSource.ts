const DEFAULT_SCRIPTS_SOURCE_URL = "https://www.botcscripts.com";

// Base URL of the botcscripts-compatible site that scripts are imported from.
// Set SCRIPTS_SOURCE_URL to sync with a self-hosted instance instead.
export function scriptsSourceUrl() {
  return (process.env.SCRIPTS_SOURCE_URL || DEFAULT_SCRIPTS_SOURCE_URL).replace(
    /\/+$/,
    ""
  );
}

// The site a stored script was imported from, taken from its download URL so
// older rows keep pointing at the site they came from.
export function scriptSourceOrigin(script: { json_url?: string | null }) {
  if (script.json_url) {
    try {
      return new URL(script.json_url).origin;
    } catch {
      // Fall through to the configured source
    }
  }

  return scriptsSourceUrl();
}
