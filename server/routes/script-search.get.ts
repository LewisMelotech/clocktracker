import { scriptsSourceUrl } from "~/server/utils/scriptsSource";

// Sends people to a script search on the site scripts are imported from, for
// games and events whose script isn't in ClockTracker.
export default defineEventHandler((event) => {
  const { name } = getQuery(event) as { name?: string };

  return sendRedirect(
    event,
    `${scriptsSourceUrl()}/?search=${encodeURIComponent(name ?? "")}`
  );
});
