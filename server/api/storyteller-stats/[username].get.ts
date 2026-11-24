import {
  Prisma,
  PrivacySetting,
  WinStatus_V2,
} from "~/server/generated/prisma/client";
import { prisma } from "~/server/utils/prisma";

// Global per-storyteller win rates used by the "Best/Worst Storyteller"
// highlights on a player's stats page.
//
// For every primary storyteller tagged in the given player's games, this
// returns how often Good and Evil won across ALL public games run by that
// storyteller (not just games this player was in). Instance-wide rates are
// also returned as a fallback for storytellers without global data.

type StorytellerWinCounts = {
  games: number;
  good_wins: number;
  evil_wins: number;
};

export default defineEventHandler(async (handler) => {
  const username = handler.context.params?.username as string;

  const user = await prisma.userSettings.findUnique({
    where: { username },
    select: { user_id: true },
  });

  if (!user) {
    throw createError({ status: 404, statusMessage: "Not Found" });
  }

  // Primary storyteller names tagged in this player's games.
  const taggedRows = await prisma.game.groupBy({
    by: ["storyteller"],
    where: {
      user_id: user.user_id,
      is_storyteller: false,
      deleted: false,
      storyteller: { not: null },
    },
    _count: { _all: true },
  });

  const names = taggedRows
    .map((row) => row.storyteller?.trim() ?? "")
    .filter((name) => name.length > 0);

  const base: Prisma.GameWhereInput = {
    deleted: false,
    parent_game_id: null,
    is_storyteller: false, // Player isn't the storyteller
    ignore_for_stats: false, // Must be marked that it is included for stats
    privacy: PrivacySetting.PUBLIC,
    user: { privacy: { not: PrivacySetting.PERSONAL } },
    win_v2: { in: [WinStatus_V2.GOOD_WINS, WinStatus_V2.EVIL_WINS] },
  };

  const [perStorytellerRows, globalRows] = await Promise.all([
    names.length
      ? prisma.game.groupBy({
          by: ["storyteller", "win_v2"],
          where: { ...base, storyteller: { in: names } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.game.groupBy({
      by: ["win_v2"],
      where: base,
      _count: { _all: true },
    }),
  ]);

  const storytellers: Record<string, StorytellerWinCounts> = {};

  for (const row of perStorytellerRows) {
    const name = row.storyteller?.trim();
    if (!name) continue;

    const entry = (storytellers[name] ??= {
      games: 0,
      good_wins: 0,
      evil_wins: 0,
    });

    entry.games += row._count._all;

    if (row.win_v2 === WinStatus_V2.GOOD_WINS) {
      entry.good_wins += row._count._all;
    } else {
      entry.evil_wins += row._count._all;
    }
  }

  const global: StorytellerWinCounts = { games: 0, good_wins: 0, evil_wins: 0 };

  for (const row of globalRows) {
    global.games += row._count._all;

    if (row.win_v2 === WinStatus_V2.GOOD_WINS) {
      global.good_wins += row._count._all;
    } else {
      global.evil_wins += row._count._all;
    }
  }

  return { storytellers, global };
});
