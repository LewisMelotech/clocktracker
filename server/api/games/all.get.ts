import { PrivacySetting } from "~/server/generated/prisma/client";
import type { SupabaseUser as User } from "~/server/utils/supabaseUser";
import type { GameRecord } from "~/server/utils/anonymizeGame";
import { prisma } from "~/server/utils/prisma";
import { hasPermission } from "~/server/utils/permissions";

// Lists every game on this instance, regardless of community membership.
// Intended for self-hosted, single-community instances; toggle it with
// NUXT_PUBLIC_ALL_GAMES_BROWSING=false.
export default defineEventHandler(async (handler) => {
  const me: User | null = handler.context.user;

  if (!useRuntimeConfig().public.allGamesBrowsing) {
    throw createError({
      status: 404,
      statusMessage: "Not Found",
    });
  }

  if (!me) {
    throw createError({
      status: 401,
      statusMessage: "Unauthorized",
    });
  }

  const canViewPrivate = await hasPermission(me.id, "VIEW_PRIVATE_GAMES");

  const friendIds = (
    await prisma.friend.findMany({
      where: { user_id: me.id },
      select: { friend_id: true },
    })
  ).map((f) => f.friend_id);

  // Public games from everyone, plus your own and your friends' games.
  // PERSONAL games and profiles are hidden, matching fetchGame.
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

  const games = await prisma.game.findMany({
    take: 500,
    where: {
      deleted: false,
      parent_game_id: null,
      waiting_for_confirmation: false,
      ...privacyFilter,
    },
    include: {
      ls_game: {
        select: {
          campaign: {
            select: {
              title: true,
              id: true,
            },
          },
        },
      },
      user: {
        select: {
          privacy: true,
          username: true,
        },
      },
      player_characters: {
        include: {
          role: {
            select: {
              token_url: true,
              alternate_token_urls: true,
              type: true,
              initial_alignment: true,
            },
          },
          related_role: {
            select: {
              token_url: true,
            },
          },
        },
      },
      demon_bluffs: {
        select: {
          id: true,
          role_id: true,
          game_id: true,
          role: {
            select: {
              token_url: true,
              type: true,
            },
          },
        },
      },
      fabled: {
        select: {
          id: true,
          role_id: true,
          game_id: true,
          role: {
            select: {
              token_url: true,
              type: true,
            },
          },
        },
      },
      grimoire: {
        include: {
          tokens: {
            select: {
              id: true,
              role_id: true,
              related_role_id: true,
              alignment: true,
              is_dead: true,
              used_ghost_vote: true,
              order: true,
              grimoire_id: true,
              player_name: true,
              player_id: true,
              created_at: true,
              role: {
                select: {
                  token_url: true,
                  type: true,
                  initial_alignment: true,
                  name: true,
                },
              },
              related_role: {
                select: {
                  token_url: true,
                },
              },
              player: {
                select: {
                  display_name: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
      },
      parent_game: {
        select: {
          user: {
            select: {
              username: true,
              display_name: true,
            },
          },
        },
      },
      child_games: {
        select: {
          id: true,
          user_id: true,
        },
      },
      community: {
        select: {
          slug: true,
          icon: true,
        },
      },
      associated_script: {
        select: {
          version: true,
          script_id: true,
          is_custom_script: true,
          logo: true,
          background: true,
        },
      },
    },
    orderBy: [
      {
        date: "desc",
      },
      {
        created_at: "desc",
      },
      {
        id: "desc",
      },
    ],
  });

  const anonymizedGames: GameRecord[] = [];

  for (const game of games) {
    anonymizedGames.push(
      await anonymizeGame(
        game as GameRecord,
        me,
        canViewPrivate || friendIds.includes(game.user_id)
      )
    );
  }

  return anonymizedGames;
});
