<template>
  <div>
    <h2 class="font-sorts text-center text-xl lg:text-2xl mb-2 lg:mb-4">
      Highlights
    </h2>

    <div class="grid gap-2 md:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <!-- Most played -->
      <div class="p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40 flex flex-col gap-2 md:gap-3">
        <h3 class="font-sorts text-center text-lg lg:text-xl">
          Most Played
        </h3>

        <div v-if="mostPlayed" class="flex flex-col items-center gap-2">
          <nuxt-link
            :to="roleLink(mostPlayed.role.name)"
           >
            <Token
              :character="{
                name: mostPlayed.role.name,
                role: {
                  name: mostPlayed.role.name,
                  token_url: mostPlayed.role.token_url,
                },
              }"
              size="lg"
            />
          </nuxt-link>

          <div class="text-center text-sm text-balance max-w-44">
            {{ props.isMe ? `You've` : `This player has` }} been {{ roleArticle(mostPlayed.role.name) }}<span class="font-semibold">{{ mostPlayed.role.name }}</span> 
            a total of {{ mostPlayed.plays }} game<span v-if="mostPlayed.plays !== 1">s</span>.
          </div>
        </div>

        <div v-else class="flex flex-col items-center flex-grow gap-2">
          <div
            class="rounded-full shadow-lg w-36 h-36 md:w-48 md:h-48 aspect-square bg-stone-200 dark:bg-stone-800 border border-stone-400"
          />
          <p class="text-center text-sm text-stone-400 text-balance">
            No recorded games.
          </p>
        </div>
      </div>

      <!-- Best performing -->
      <div class="p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40 flex flex-col gap-2 md:gap-3">
        <h3 class="font-sorts text-center text-lg lg:text-xl">
          Best Performing
          <IconUI 
            v-tooltip="{
              content: bestPerformingTooltip,
              html: true,
            }"
            id="info-circle" 
            size="sm" 
          />
        </h3>

        <div v-if="bestPerforming" class="flex flex-col items-center gap-2">
          <nuxt-link 
            :to="roleLink(bestPerforming.role.name)"
          >
            <Token
              :character="{
                name: bestPerforming.role.name,
                role: {
                  name: bestPerforming.role.name,
                  token_url: bestPerforming.role.token_url,
                },
              }"
              size="lg"
            />
          </nuxt-link>

          <div class="text-center text-sm text-balance max-w-44">
            {{ props.isMe ? `You` : `This player` }} finished {{ bestPerforming.plays }} game<span v-if="bestPerforming.plays !== 1">s</span> as
            {{ roleArticle(bestPerforming.role.name) }}<span class="font-semibold">{{ bestPerforming.role.name }}</span> and
            <span v-if="bestPerforming.losses > 0">won {{ bestPerforming.wins }} of those.</span>
            <span v-else>all of those were wins!</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center flex-grow gap-2">
          <div
            class="rounded-full shadow-lg w-36 h-36 md:w-48 md:h-48 aspect-square bg-stone-200 dark:bg-stone-800 border border-stone-400"
          />
          <p class="text-center text-sm text-stone-400 text-balance">
            No eligible character.
          </p>
        </div>
      </div>

      <!-- Worst performing -->
      <div class="p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40 flex flex-col gap-2 md:gap-3">
        <h3 class="font-sorts text-center text-lg lg:text-xl">
          Worst Performing
          <IconUI 
            v-tooltip="{
              content: worstPerformingTooltip,
              html: true,
            }"
            id="info-circle" 
            size="sm" 
          />
        </h3>

        <div v-if="worstPerforming" class="flex flex-col items-center gap-2">
          <nuxt-link 
          :to="roleLink(worstPerforming.role.name)"
          >
            <Token
              :character="{
                name: worstPerforming.role.name,
                role: {
                  name: worstPerforming.role.name,
                  token_url: worstPerforming.role.token_url,
                },
              }"
              size="lg"
            />
          </nuxt-link>

          <div class="text-center text-sm text-balance max-w-44">
            {{ props.isMe ? `You` : `This player` }} finished {{ worstPerforming.plays }} game<span v-if="worstPerforming.plays !== 1">s</span> as
            {{ roleArticle(worstPerforming.role.name) }}<span class="font-semibold">{{ worstPerforming.role.name }}</span> and 
            <span v-if="worstPerforming.wins > 0">won only {{ worstPerforming.wins }} of those.</span>
            <span v-else>tragically all of those were losses...</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center flex-grow gap-2">
          <div
            class="rounded-full shadow-lg w-36 h-36 md:w-48 md:h-48 aspect-square bg-stone-200 dark:bg-stone-800 border border-stone-400"
          />
          <p class="text-center text-sm text-stone-400 text-balance">
            No eligible character.
          </p>
        </div>
      </div>

      <!-- Best storyteller -->
      <div class="p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40 flex flex-col gap-2 md:gap-3">
        <h3 class="font-sorts text-center text-lg lg:text-xl">
          Best Storyteller
          <IconUI 
            v-tooltip="{
              content: storytellerTooltip,
              html: true,
            }"
            id="info-circle" 
            size="sm" 
          />
        </h3>

        <div v-if="bestStoryteller" class="flex flex-col items-center gap-2">
          <nuxt-link
            v-if="bestStoryteller.isRegistered"
            :to="`/@${bestStoryteller.display}`"
          >
            <Avatar
              :value="`/api/user/${bestStoryteller.display}/avatar`"
              size="lg-token"
            />
          </nuxt-link>
          <Token
            v-else
            :character="{
              name: bestStoryteller.display,
              role: {
                name: bestStoryteller.display,
                token_url: '/img/role/storyteller.webp',
              },
            }"
            size="lg"
          />

          <div class="text-center text-sm text-balance max-w-44">
            {{ props.isMe ? `You have` : `This player has` }} played {{ bestStoryteller.games }} games under
            <span class="font-semibold">{{ bestStoryteller.display }}</span>. On average,
            {{ props.isMe ? `you'd` : `they'd` }} win {{ bestStoryteller.expectedPercent }}% of them, but instead won {{ bestStoryteller.actualPercent }}%.
          </div>
        </div>

        <div v-else class="flex flex-col items-center flex-grow gap-2">
          <div
            class="rounded-full shadow-lg w-36 h-36 md:w-48 md:h-48 aspect-square bg-stone-200 dark:bg-stone-800 border border-stone-400"
          />
          <p class="text-center text-sm text-stone-400 text-balance">
            No eligible storyteller.
          </p>
        </div>
      </div>

      <!-- Worst storyteller -->
      <div class="p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40 flex flex-col gap-2 md:gap-3">
        <h3 class="font-sorts text-center text-lg lg:text-xl">
          Worst Storyteller
          <IconUI 
            v-tooltip="{
              content: storytellerTooltip,
              html: true,
            }"
            id="info-circle" 
            size="sm" 
          />
        </h3>

        <div v-if="worstStoryteller" class="flex flex-col items-center gap-2">
          <nuxt-link
            v-if="worstStoryteller.isRegistered"
            :to="`/@${worstStoryteller.display}`"
          >
            <Avatar
              :value="`/api/user/${worstStoryteller.display}/avatar`"
              size="lg-token"
            />
          </nuxt-link>
          <Token
            v-else
            :character="{
              name: worstStoryteller.display,
              role: {
                name: worstStoryteller.display,
                token_url: '/img/role/storyteller.webp',
              },
            }"
            size="lg"
          />

          <div class="text-center text-sm text-balance max-w-44">
            {{ props.isMe ? `You have` : `This player has` }} played {{ worstStoryteller.games }} games under
            <span class="font-semibold">{{ worstStoryteller.display }}</span>. On average,
            {{ props.isMe ? `you'd` : `they'd` }} win {{ worstStoryteller.expectedPercent }}% of them, but instead won {{ worstStoryteller.actualPercent }}%.
          </div>
        </div>

        <div v-else class="flex flex-col items-center flex-grow gap-2">
          <div
            class="rounded-full shadow-lg w-36 h-36 md:w-48 md:h-48 aspect-square bg-stone-200 dark:bg-stone-800 border border-stone-400"
          />
          <p class="text-center text-sm text-stone-400 text-balance">
            No eligible storyteller.
          </p>
        </div>
      </div>

      <!-- Best friend -->
      <div class="p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40 flex flex-col gap-2 md:gap-3">
        <h3 class="font-sorts text-center text-lg lg:text-xl">
          Best Friend
          <IconUI 
            v-tooltip="{
              content: teammateTooltip,
              html: true,
            }"
            id="info-circle" 
            size="sm" 
          />
        </h3>

        <div v-if="bestFriend" class="flex flex-col items-center gap-2">
          <nuxt-link
            v-if="bestFriend.isRegistered"
            :to="`/@${bestFriend.display}`"
          >
            <Avatar
              :value="bestFriend.avatar"
              size="lg-token"
            />
          </nuxt-link>
          <Avatar
            v-else
            size="lg-token"
          />

          <div class="text-center text-sm text-balance max-w-44">
            {{ props.isMe ? `You were` : `This player was` }} on the same team as
            <span class="font-semibold">{{ bestFriend.display }}</span>
            {{ bestFriend.sameTeamPercent }}% of the time over {{ bestFriend.games }} games.
          </div>
        </div>

        <div v-else class="flex flex-col items-center flex-grow gap-2">
          <div
            class="rounded-full shadow-lg w-36 h-36 md:w-48 md:h-48 aspect-square bg-stone-200 dark:bg-stone-800 border border-stone-400"
          />
          <p class="text-center text-sm text-stone-400 text-balance">
            No eligible player.
          </p>
        </div>
      </div>

      <!-- Biggest rival -->
      <div class="p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40 flex flex-col gap-2 md:gap-3">
        <h3 class="font-sorts text-center text-lg lg:text-xl">
          Biggest Rival
          <IconUI 
            v-tooltip="{
              content: teammateTooltip,
              html: true,
            }"
            id="info-circle" 
            size="sm" 
          />
        </h3>

        <div v-if="biggestRival" class="flex flex-col items-center gap-2">
          <nuxt-link
            v-if="biggestRival.isRegistered"
            :to="`/@${biggestRival.display}`"
          >
            <Avatar
              :value="biggestRival.avatar"
              size="lg-token"
            />
          </nuxt-link>
          <Avatar
            v-else
            size="lg-token"
          />

          <div class="text-center text-sm text-balance max-w-44">
            {{ props.isMe ? `You were` : `This player was` }} on the same team as
            <span class="font-semibold">{{ biggestRival.display }}</span>
            {{ biggestRival.sameTeamPercent }}% of the time over {{ biggestRival.games }} games.
          </div>
        </div>

        <div v-else class="flex flex-col items-center flex-grow gap-2">
          <div
            class="rounded-full shadow-lg w-36 h-36 md:w-48 md:h-48 aspect-square bg-stone-200 dark:bg-stone-800 border border-stone-400"
          />
          <p class="text-center text-sm text-stone-400 text-balance">
            No eligible player.
          </p>
        </div>
      </div>

      <!-- Alignment -->
      <div class="lg:col-span-3 xl:col-span-1 p-4 border rounded-lg dark:border-stone-700/50 bg-stone-300/30 dark:bg-stone-900/40">
        <h3 class="font-sorts text-center text-lg lg:text-xl mb-2 md:mb-3">
          Win Rate
        </h3>

        <StatsPlayerAlignmentWins 
          :games="games" 
          class="w-full mb-2" 
        />

        <div v-if="alignmentWinMessage" class="text-center text-sm text-balance max-w-64 mx-auto">
          <template v-if="alignmentWinMessage.alignment === 'GOOD'">
            {{ props.isMe ? 'You win' : 'This player wins' }} more games as
            <span class="font-semibold" :style="`color: ${chartColors.good}`">Good</span>.
          </template>
          <template v-else-if="alignmentWinMessage.alignment === 'EVIL'">
            {{ props.isMe ? 'You win' : 'This player wins' }} more games as
            <span class="font-semibold" :style="`color: ${chartColors.evil}`">Evil</span>.
          </template>
          <template v-else>
            {{ props.isMe ? 'You win' : 'This player wins' }} games equally as
            <span class="font-semibold" :style="`color: ${chartColors.good}`">Good</span> and
            <span class="font-semibold" :style="`color: ${chartColors.evil}`">Evil</span>.
          </template>
        </div>
        <div v-else>
          <p class="text-center text-sm text-stone-400 text-balance">
            No data.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { GameRecord } from "~/composables/useGames";
import { WinStatus_V2 } from "~/composables/useGames";
import { chartColors } from "~/composables/useChartColors";

// Minimum number of games required for a character to be considered in best/worst performance.
const MIN_PLAYS_FOR_PERFORMANCE = 3;
const MIN_WIN_RATE_FOR_BEST = 0.5;
const MAX_WIN_RATE_FOR_WORST = 0.49;

// Bayesian weighting for the storyteller performance highlights.
// Adjusted win rate Radj = (W + K * E) / (N + K).
const K_GOOD = 4;
const K_EVIL = 2;

// Minimum decided games the player must have played with a storyteller,
// and minimum decided games a storyteller must have run instance-wide,
// for the storyteller to be considered in the best/worst highlights.
const MIN_GAMES_WITH_STORYTELLER = 3;
const MIN_GAMES_RUN_BY_STORYTELLER = 3;

type Alignment = "GOOD" | "EVIL" | null;

const props = defineProps<{
  games: GameRecord[];
  isMe?: boolean;
  username: string;
}>();

type RoleSummary = {
  role: {
    name: string;
    token_url: string | null;
    initial_alignment?: Alignment;
  };
  plays: number;
  wins: number;
  losses: number;
};

type SideSummary = {
  side: "GOOD" | "EVIL";
  plays: number;
  wins: number;
  losses: number;
};

/**
 * Build stats map for roles.
 * 
 * Currently only considers the character the player ended the game as.
 * 
 * @todo Maybe this should include all characters during a game?
 */
const roleStatsMap = computed<Map<string, RoleSummary>>(() => {
  const map = new Map<string, RoleSummary>();

  for (const game of props.games) {
    const last = getStatsCharacter(game);
    if (!last) continue;

    const alignment = last.alignment as Alignment;
    if (!alignment) continue;

    const displayName = last.name;
    const key = displayName;

    const tokenUrl =
      last.role?.token_url ?? last.related_role?.token_url ?? null;

    const result = game.win_v2;

    let stats = map.get(key);
    if (!stats) {
      stats = {
        role: {
          name: displayName,
          token_url: tokenUrl,
          initial_alignment: alignment,
        },
        plays: 0,
        wins: 0,
        losses: 0,
      };
      map.set(key, stats);
    }

    stats.plays++;

    const goodWins = result === "GOOD_WINS";
    const evilWins = result === "EVIL_WINS";

    if (
      (alignment === "GOOD" && goodWins) ||
      (alignment === "EVIL" && evilWins)
    ) {
      stats.wins++;
    } 
    else if (
      (alignment === "GOOD" && evilWins) ||
      (alignment === "EVIL" && goodWins)
    ) {
      stats.losses++;
    }
  }

  return map;
});

/**
 * Determine stats for each alignment.
 */
const alignmentStats = computed(() => {
  const good: SideSummary = { side: "GOOD", plays: 0, wins: 0, losses: 0 };
  const evil: SideSummary = { side: "EVIL", plays: 0, wins: 0, losses: 0 };

  for (const game of props.games) {
    const last = getStatsCharacter(game);
    if (!last) continue;

    const alignment = last.alignment as Alignment;
    if (!alignment) continue;

    const result = game.win_v2;
    const goodWins = result === "GOOD_WINS";
    const evilWins = result === "EVIL_WINS";

    if (alignment === "GOOD") {
      good.plays++;
      if (goodWins) good.wins++;
      else if (evilWins) good.losses++;
    } 
    else if (alignment === "EVIL") {
      evil.plays++;
      if (evilWins) evil.wins++;
      else if (goodWins) evil.losses++;
    }
  }

  if (!good.plays && !evil.plays) {
    return null;
  }

  return { good, evil };
});

const alignmentWinMessage = computed<{
  alignment: "GOOD" | "EVIL" | null;
} | null>(() => {
  const stats = alignmentStats.value;
  if (!stats) return null;

  const goodDecided = stats.good.wins + stats.good.losses;
  const evilDecided = stats.evil.wins + stats.evil.losses;

  if (!goodDecided && !evilDecided) return null;

  const goodRate = goodDecided ? stats.good.wins / goodDecided : 0;
  const evilRate = evilDecided ? stats.evil.wins / evilDecided : 0;

  if (goodDecided && evilDecided) {
    if (goodRate > evilRate) return { alignment: "GOOD" };
    if (evilRate > goodRate) return { alignment: "EVIL" };
    return { alignment: null };
  }

  return { alignment: goodDecided ? "GOOD" : "EVIL" };
});

/**
 * Determine "Most Played" character.
 */
const mostPlayed = computed<RoleSummary | null>(() => {
  let best: RoleSummary | null = null;

  for (const stats of roleStatsMap.value.values()) {
    if (!best || stats.plays > best.plays) {
      best = stats;
    }
  }

  return best;
});

/**
 * Determine "Best Performing" character.
 * 
 * Characters need at least MIN_PLAYS_FOR_PERFORMANCE 
 * plays to be considered.
 */
const bestPerforming = computed<RoleSummary | null>(() => {
  let best: RoleSummary | null = null;

  for (const stats of roleStatsMap.value.values()) {
    if (stats.plays < MIN_PLAYS_FOR_PERFORMANCE) continue;

    const total = stats.wins + stats.losses;
    const winRate = total > 0 ? stats.wins / total : 0;

    if (total === 0) continue;
    if (winRate < MIN_WIN_RATE_FOR_BEST) continue;

    const bestWins = best?.wins ?? 0;
    const bestLosses = best?.losses ?? 0;
    const bestTotal = bestWins + bestLosses;
    const bestRate = bestTotal > 0 ? bestWins / bestTotal : 0;

    if (
      !best ||
      winRate > bestRate ||
      (winRate === bestRate && stats.wins > bestWins) ||
      (winRate === bestRate &&
        stats.wins === bestWins &&
        stats.plays > best.plays)
    ) {
      best = stats;
    }
  }

  return best;
});

const bestPerformingTooltip = computed(
  () =>
    `<div class='w-[250px]'>Only characters with at least ${MIN_PLAYS_FOR_PERFORMANCE} plays and a win rate of 50% or higher are considered.</div>`
);

/**
 * Determine "Worst Performing" character.
 * 
 * Characters need at least MIN_PLAYS_FOR_PERFORMANCE 
 * plays to be considered.
 */
const worstPerforming = computed<RoleSummary | null>(() => {
  let worst: RoleSummary | null = null;

  for (const stats of roleStatsMap.value.values()) {
    if (stats.plays < MIN_PLAYS_FOR_PERFORMANCE) continue;

    const total = stats.wins + stats.losses;
    const winRate = total > 0 ? stats.wins / total : 0;

    if (total === 0) continue;
    if (winRate > MAX_WIN_RATE_FOR_WORST) continue;
    if (stats.losses === 0) continue;

    const worstWins = worst?.wins ?? 0;
    const worstLosses = worst?.losses ?? 0;
    const worstTotal = worstWins + worstLosses;
    const worstRate = worstTotal > 0 ? worstWins / worstTotal : 0;

    if (
      !worst ||
      winRate < worstRate ||
      (winRate === worstRate && stats.losses > worstLosses) ||
      (winRate === worstRate &&
        stats.losses === worstLosses &&
        stats.plays > worst.plays)
    ) {
      worst = stats;
    }
  }

  return worst;
});

const worstPerformingTooltip = computed(
  () =>
    `<div class='w-[250px]'>Only characters with at least ${MIN_PLAYS_FOR_PERFORMANCE} plays and a win rate lower than 50% are considered.</div>`
);

type StorytellerWinCounts = {
  games: number;
  good_wins: number;
  evil_wins: number;
};

// Global per-storyteller win rates, used to determine the expected win rate
// for a team when playing with a given storyteller.
const storytellerGlobalStats = ref<{
  storytellers: Record<string, StorytellerWinCounts>;
  global: StorytellerWinCounts;
} | null>(null);

onMounted(async () => {
  try {
    storytellerGlobalStats.value = await $fetch(
      `/api/storyteller-stats/${props.username}`
    );
  } catch (err) {
    console.error("Failed to fetch storyteller win rates", err);
  }
});

type StorytellerSideStats = {
  plays: number;
  wins: number;
};

type StorytellerPlayerStats = {
  name: string;
  display: string;
  isRegistered: boolean;
  good: StorytellerSideStats;
  evil: StorytellerSideStats;
};

/**
 * Build stats map for storytellers.
 *
 * Only decided games where this player was on a team (not the storyteller)
 * and the primary storyteller is known are considered.
 */
const storytellerStatsMap = computed<Map<string, StorytellerPlayerStats>>(
  () => {
    const map = new Map<string, StorytellerPlayerStats>();

    for (const game of props.games) {
      if (game.is_storyteller) continue;

      const storyteller = game.storyteller?.trim();
      if (!storyteller) continue;
      if (storyteller === `@${props.username}`) continue;

      const last = getStatsCharacter(game);
      if (!last) continue;

      const alignment = last.alignment as Alignment;
      if (alignment !== "GOOD" && alignment !== "EVIL") continue;

      const result = game.win_v2;
      const goodWins = result === WinStatus_V2.GOOD_WINS;
      const evilWins = result === WinStatus_V2.EVIL_WINS;
      if (!goodWins && !evilWins) continue;

      let stats = map.get(storyteller);
      if (!stats) {
        stats = {
          name: storyteller,
          display: storyteller.replace(/^@/, ""),
          isRegistered: storyteller.startsWith("@") && storyteller.length > 1,
          good: { plays: 0, wins: 0 },
          evil: { plays: 0, wins: 0 },
        };
        map.set(storyteller, stats);
      }

      if (alignment === "GOOD") {
        stats.good.plays++;
        if (goodWins) stats.good.wins++;
      } else {
        stats.evil.plays++;
        if (evilWins) stats.evil.wins++;
      }
    }

    return map;
  }
);

type StorytellerHighlight = {
  display: string;
  isRegistered: boolean;
  overall: number;
  games: number;
  expectedPercent: number;
  actualPercent: number;
};

/**
 * Determine the "Best Storyteller" (highest overall performance) or the
 * "Worst Storyteller" (lowest overall performance).
 *
 * The overall performance weighs the Bayesian-adjusted win rates for Good
 * and Evil, relative to the expected win rate for the player's team with
 * that storyteller, by the number of games played on each team:
 *
 * O = Padj_good * (N_good / N_total) + Padj_evil * (N_evil / N_total)
 *
 * Sides without recorded games contribute nothing (their weight is zero,
 * and their adjusted rate equals the expected rate).
 *
  * Storytellers need at least MIN_GAMES_WITH_STORYTELLER decided games with
  * this player, and at least MIN_GAMES_RUN_BY_STORYTELLER decided games run
  * instance-wide, to be considered.
  *
  * The best card is only shown when the storyteller actually overperformed
  * (overall > 0), and the worst card only when they underperformed
  * (overall < 0).
  *
  * Ties are broken by more games played.
  */
function resolveStorytellerHighlight(
  mode: "best" | "worst"
): StorytellerHighlight | null {
  const globalStats = storytellerGlobalStats.value;
  if (!globalStats) return null;

  let pick: StorytellerHighlight | null = null;

  for (const stats of storytellerStatsMap.value.values()) {
    const nGood = stats.good.plays;
    const wGood = stats.good.wins;
    const nEvil = stats.evil.plays;
    const wEvil = stats.evil.wins;
    const total = nGood + nEvil;

    if (total < MIN_GAMES_WITH_STORYTELLER) continue;

    const stGlobal = globalStats.storytellers[stats.name];
    if (!stGlobal || stGlobal.games < MIN_GAMES_RUN_BY_STORYTELLER) continue;

    const expectedGood = stGlobal.good_wins / stGlobal.games;
    const expectedEvil = stGlobal.evil_wins / stGlobal.games;

    const adjustedGood = (wGood + K_GOOD * expectedGood) / (nGood + K_GOOD);
    const adjustedEvil = (wEvil + K_EVIL * expectedEvil) / (nEvil + K_EVIL);

    const overall =
      ((adjustedGood - expectedGood) * nGood +
        (adjustedEvil - expectedEvil) * nEvil) /
      total;

    if (
      !pick ||
      (mode === "best" ? overall > pick.overall : overall < pick.overall) ||
      (overall === pick.overall && total > pick.games)
    ) {
      pick = {
        display: stats.display,
        isRegistered: stats.isRegistered,
        overall,
        games: total,
        expectedPercent: Math.round(
          ((nGood * expectedGood + nEvil * expectedEvil) / total) * 100
        ),
        actualPercent: Math.round(((wGood + wEvil) / total) * 100),
      };
    }
  }

  // Only show the card if the storyteller actually overperformed (best)
  // or underperformed (worst).
  if (pick) {
    if (mode === "best" && pick.overall <= 0) return null;
    if (mode === "worst" && pick.overall >= 0) return null;
  }

  return pick;
}

const bestStoryteller = computed(() => resolveStorytellerHighlight("best"));
const worstStoryteller = computed(() => resolveStorytellerHighlight("worst"));

const storytellerTooltip = computed(
  () =>
    `<div class='w-[250px]'>Only storytellers which have run at least ${MIN_GAMES_RUN_BY_STORYTELLER} games, and which the player has played at least ${MIN_GAMES_WITH_STORYTELLER} games with, are considered. Storytellers are ranked based on their average performance per good/evil.</div>`
);

// Bayesian weighting for the teammate highlights (best friend / biggest rival).
// Adjusted rate = (N + K * E) / (Ntotal + K).
const K_TEAM = 5;
const E_TEAM = 0.5;
const MIN_GAMES_TOGETHER = 3;

type TeammateStats = {
  key: string;
  display: string;
  isRegistered: boolean;
  avatar: string | null;
  same_team: number;
  opposite_team: number;
};

/**
 * Build stats map for teammates.
 *
 * Team matching uses the last grimoire page (the final grimoire state).
 * The viewed player's team comes from their own token when seated,
 * falling back to the character they ended the game as.
 *
 * Games flagged with `ignore_for_stats` and games where the player was
 * the storyteller are ignored. Tokens for Fabled/Loric roles and unnamed
 * seats are excluded. Games without a recorded result still count, as
 * being on the same team does not depend on who won.
 */
const teammateStatsMap = computed<Map<string, TeammateStats>>(() => {
  const map = new Map<string, TeammateStats>();

  for (const game of props.games) {
    if (game.is_storyteller) continue;
    if (game.ignore_for_stats) continue;

    const page = game.grimoire?.at(-1);
    if (!page?.tokens?.length) continue;

    // The viewed player's alignment: their grimoire token when seated,
    // otherwise the character they ended the game as.
    let playerAlignment: Alignment | null = null;
    for (const token of page.tokens) {
      if (token.player_id && token.player_id === game.user_id) {
        playerAlignment = token.alignment as Alignment;
        break;
      }
    }
    if (
      playerAlignment !== "GOOD" &&
      playerAlignment !== "EVIL"
    ) {
      const last = getStatsCharacter(game);
      playerAlignment = (last?.alignment as Alignment) ?? null;
    }
    if (playerAlignment !== "GOOD" && playerAlignment !== "EVIL") continue;

    for (const token of page.tokens) {
      if (token.player_id === game.user_id) continue;
      if (token.alignment !== "GOOD" && token.alignment !== "EVIL") continue;
      if (token.role?.type === "FABLED" || token.role?.type === "LORIC") {
        continue;
      }

      const key = token.player_id ?? token.player_name;
      if (!key) continue;

      let stats = map.get(key);
      if (!stats) {
        stats = {
          key,
          display: token.player?.username ?? token.player_name,
          isRegistered: !!token.player?.username,
          avatar: token.player?.avatar ?? null,
          same_team: 0,
          opposite_team: 0,
        };
        map.set(key, stats);
      }

      if (token.alignment === playerAlignment) {
        stats.same_team++;
      } else {
        stats.opposite_team++;
      }
    }
  }

  return map;
});

type TeammateHighlight = {
  display: string;
  isRegistered: boolean;
  avatar: string | null;
  sameTeamPercent: number;
  games: number;
};

/**
 * Determine the "Best Friend" (highest adjusted same-team rate) or the
 * "Biggest Rival" (highest adjusted opposite-team rate).
 *
 * The adjusted rate pulls the observed rate toward the expected rate
 * E_TEAM by K_TEAM games:
 *
 * rate = (N + K * E) / (Ntotal + K)
 *
 * Players need at least MIN_GAMES_TOGETHER games played together to be
 * considered. Ties are broken by more games played together.
 */
function resolveTeammateHighlight(
  mode: "best" | "worst"
): TeammateHighlight | null {
  let pick: (TeammateHighlight & { score: number; games: number }) | null =
    null;

  for (const stats of teammateStatsMap.value.values()) {
    const total = stats.same_team + stats.opposite_team;
    if (total < MIN_GAMES_TOGETHER) continue;

    const n = mode === "best" ? stats.same_team : stats.opposite_team;
    const score = (n + K_TEAM * E_TEAM) / (total + K_TEAM);

    if (
      !pick ||
      score > pick.score ||
      (score === pick.score && total > pick.games)
    ) {
      pick = {
        display: stats.display,
        isRegistered: stats.isRegistered,
        avatar: stats.avatar,
        sameTeamPercent: Math.round((stats.same_team / total) * 100),
        games: total,
        score,
      };
    }
  }

  return pick;
}

const bestFriend = computed(() => resolveTeammateHighlight("best"));
const biggestRival = computed(() => resolveTeammateHighlight("worst"));

const teammateTooltip = computed(
  () =>
    `<div class='w-[250px]'>Only players with at least ${MIN_GAMES_TOGETHER} games played together are considered. Players are ranked by their adjusted same/opposite-team rate.</div>`
);


/**
 * Determine the character used for stats in a game.
 *
 * Currently this uses the last character in `player_characters`,
 * which represents the role a player ended the game as.
 *
 * Games flagged with `ignore_for_stats`, games without characters,
 * nameless characters, and Fabled roles are ignored.
 */
function getStatsCharacter(game: GameRecord) {
  if (game.ignore_for_stats) return null;
  if (!game.player_characters.length) return null;

  const last = game.player_characters.at(-1);
  if (!last || !last.name) return null;
  if (last.role?.type === "FABLED" || last.role?.type === "LORIC") return null;

  return last;
}

/**
 * Return a link to a characters detail page.
 */
function roleLink(name?: string) {
  if (!name) return "#";
  return `/roles/${name.toLowerCase().replace(/ /g, "_")}`;
}

/**
 * Return "the " for most roles, but omit it for plural/group-style names
 * or names that already start with "The ".
 */
function roleArticle(name: string): "" | "the " {
  const pluralRoles = [
    "Legion", 
    "Lil' Monsta", 
    "Riot", 
  ];
  if (pluralRoles.includes(name)) return "";
  if (name.startsWith("The ")) return "";
  return "the ";
}
</script>
