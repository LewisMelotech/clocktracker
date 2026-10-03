import { PrivacySetting } from "~/server/generated/prisma/client";
import type { SupabaseUser as User } from "~/server/utils/supabaseUser";
import { prisma } from "~/server/utils/prisma";
import { hasPermission } from "~/server/utils/permissions";
import {
  buildCommunityStats,
  communityStatsGameSelect,
} from "~/server/utils/communityStats";

// Community stats over every game on a single-community instance, counting
// the games this user could see when browsing all games (/api/games/all).
export default defineEventHandler(async (handler) => {
  if (!useRuntimeConfig().public.singleCommunity) {
    throw createError({ status: 404, statusMessage: "Not Found" });
  }

  const me: User | null = handler.context.user;

  if (!me) {
    throw createError({ status: 401, statusMessage: "Unauthorized" });
  }

  const canViewPrivate = await hasPermission(me.id, "VIEW_PRIVATE_GAMES");
  const friendIds = (
    await prisma.friend.findMany({
      where: { user_id: me.id },
      select: { friend_id: true },
    })
  ).map((f) => f.friend_id);

  // Public games from everyone, plus your own and your friends' games.
  // PERSONAL games and profiles are hidden, matching /api/games/all.
  const privacyFilter = canViewPrivate
    ? {}
    : {
        privacy: { not: PrivacySetting.PERSONAL },
        user: { privacy: { not: PrivacySetting.PERSONAL } },
        OR: [
          { privacy: PrivacySetting.PUBLIC },
          { user_id: { in: [me.id, ...friendIds] } },
        ],
      };

  const [members, games] = await Promise.all([
    prisma.userSettings.findMany({
      select: {
        user_id: true,
        username: true,
        display_name: true,
        avatar: true,
      },
    }),
    prisma.game.findMany({
      where: {
        deleted: false,
        parent_game_id: null,
        ...privacyFilter,
      },
      select: communityStatsGameSelect,
      orderBy: [{ date: "desc" }, { created_at: "desc" }, { id: "desc" }],
      take: 5000,
    }),
  ]);

  return {
    ...buildCommunityStats(games, new Set(members.map((m) => m.user_id))),
    members,
  };
});
