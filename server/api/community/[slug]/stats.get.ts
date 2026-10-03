import { PrivacySetting } from "~/server/generated/prisma/client";
import type { SupabaseUser as User } from "~/server/utils/supabaseUser";
import { prisma } from "~/server/utils/prisma";
import {
  buildCommunityStats,
  communityStatsGameSelect,
  emptyCommunityStats,
} from "~/server/utils/communityStats";
import { hasPermission } from "~/server/utils/permissions";

export default defineEventHandler(async (handler) => {
  const me: User | null = handler.context.user;
  const slug = handler.context.params?.slug as string;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      is_private: true,
      members: { select: { user_id: true } },
      banned_users: { select: { user_id: true } },
    },
  });

  if (!community) {
    throw createError({ status: 404, statusMessage: "Not Found" });
  }

  if (
    community.banned_users.some((banned) => banned.user_id === me?.id)
  ) {
    throw createError({ status: 403, statusMessage: "Forbidden" });
  }

  const canViewPrivate = me ? await hasPermission(me.id, "VIEW_PRIVATE_COMMUNITIES") : false;

  if (
    community.is_private &&
    !community.members.some((member) => member.user_id === me?.id) &&
    !canViewPrivate
  ) {
    return emptyCommunityStats();
  }

  const games = await prisma.game.findMany({
    where: {
      deleted: false,
      community_id: community.id,
      privacy: community.is_private
        ? { in: [PrivacySetting.PUBLIC, PrivacySetting.PRIVATE, PrivacySetting.FRIENDS_ONLY] }
        : PrivacySetting.PUBLIC,
      parent_game_id: null,
    },
    select: communityStatsGameSelect,
    orderBy: [
      { date: "desc" },
      { created_at: "desc" },
      { id: "desc" },
    ],
    take: 5000,
  });

  return buildCommunityStats(
    games,
    new Set(community.members.map((m) => m.user_id))
  );
});
