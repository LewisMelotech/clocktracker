// Tells the client whether a Discord channel webhook is configured, so the
// "Post to Discord" option only shows when it can work.
export default defineEventHandler(() => {
  return {
    enabled: !!process.env.DISCORD_WEBHOOK_URL,
  };
});
