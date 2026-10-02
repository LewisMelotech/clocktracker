import type { SupabaseUser as User } from "~/server/utils/supabaseUser";
import { Alignment, WinStatus_V2 } from "~/server/generated/prisma/client";
// @ts-ignore
import dayjs from "dayjs";
import { prisma } from "~/server/utils/prisma";
import { isAdmin } from "~/server/utils/permissions";
import { siteOrigin } from "~/server/utils/siteOrigin";
import { renderGrimoireImage } from "~/server/utils/renderGrimoireImage";

// Posts a game to Discord as an embed card, through the channel webhook in
// DISCORD_WEBHOOK_URL. The card carries a rendered image of the final
// grimoire; if there's no grimoire (or drawing it fails) the grimoire is
// listed as text instead.

const ROLE_IMAGE_SELECT = {
  id: true,
  name: true,
  token_url: true,
  type: true,
  initial_alignment: true,
  custom_role: true,
};

const BASE_SCRIPT_LOGOS: Record<string, string> = {
  "Trouble Brewing": "/img/trouble_brewing.png",
  "Sects and Violets": "/img/sects_and_violets.png",
  "Bad Moon Rising": "/img/bad_moon_rising.png",
};

const COLORS = {
  [WinStatus_V2.GOOD_WINS]: 0x3b82f6,
  [WinStatus_V2.EVIL_WINS]: 0xdc2626,
  [WinStatus_V2.NOT_RECORDED]: 0x6b7280,
};

const RESULTS = {
  [WinStatus_V2.GOOD_WINS]: "Good wins",
  [WinStatus_V2.EVIL_WINS]: "Evil wins",
  [WinStatus_V2.NOT_RECORDED]: null,
};

const ALIGNMENT_MARKERS: Record<Alignment, string> = {
  [Alignment.GOOD]: "🔵",
  [Alignment.EVIL]: "🔴",
  [Alignment.NEUTRAL]: "⚪",
};

// Discord caps embed field values at 1024 characters and a whole embed at
// 6000, so leave room for the title, description and author.
const FIELD_LIMIT = 1024;
const FIELDS_TOTAL_LIMIT = 5000;

function escapeMarkdown(text: string) {
  return text.replace(/([\\*_~`|>#\[\]()-])/g, "\\$1");
}

function trimFields(fields: { name: string; value: string }[]) {
  const kept = [];
  let total = 0;
  for (const field of fields.slice(0, 25)) {
    total += field.name.length + field.value.length;
    if (total > FIELDS_TOTAL_LIMIT) break;
    kept.push(field);
  }
  return kept;
}

export default defineEventHandler(async (handler) => {
  const user = handler.context.user as User | null;
  const gameId = handler.context.params?.id as string;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!user) {
    throw createError({
      status: 401,
      statusMessage: "Unauthorized",
    });
  }

  if (!webhookUrl) {
    throw createError({
      status: 503,
      statusMessage: "Discord posting is not set up on this server",
    });
  }

  const game = await prisma.game.findUnique({
    where: {
      id: gameId,
      deleted: false,
    },
    select: {
      user_id: true,
      date: true,
      script: true,
      location: true,
      location_type: true,
      storyteller: true,
      is_storyteller: true,
      win_v2: true,
      user: {
        select: {
          username: true,
          display_name: true,
          avatar: true,
        },
      },
      associated_script: {
        select: {
          logo: true,
        },
      },
      player_characters: {
        select: {
          name: true,
          alignment: true,
        },
      },
      demon_bluffs: {
        select: {
          name: true,
          role: {
            select: ROLE_IMAGE_SELECT,
          },
        },
      },
      fabled: {
        select: {
          name: true,
          role: {
            select: ROLE_IMAGE_SELECT,
          },
        },
      },
      grimoire: {
        select: {
          tokens: {
            select: {
              alignment: true,
              is_dead: true,
              order: true,
              player_name: true,
              role: {
                select: ROLE_IMAGE_SELECT,
              },
              related_role: {
                select: ROLE_IMAGE_SELECT,
              },
              player: {
                select: {
                  display_name: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!game) {
    throw createError({
      status: 404,
      statusMessage: "Not Found",
    });
  }

  // Only the game's owner (or an admin) can post it to the channel.
  if (game.user_id !== user.id && !(await isAdmin(user.id))) {
    throw createError({
      status: 403,
      statusMessage: "Forbidden",
    });
  }

  const origin = siteOrigin(handler);
  const absolute = (url: string | null | undefined) =>
    url ? (url.startsWith("/") ? origin + url : url) : undefined;

  const storyteller = game.storyteller?.startsWith("@")
    ? (await prisma.userSettings
        .findUnique({
          where: {
            username: game.storyteller.slice(1),
          },
          select: {
            display_name: true,
          },
        })
        .then((u) => u?.display_name)) ?? game.storyteller.slice(1)
    : game.storyteller ||
      (game.is_storyteller ? game.user?.display_name : null);

  // date is a calendar date stored as midnight UTC.
  const date = dayjs(game.date.toISOString().slice(0, 10)).format(
    "MMMM D, YYYY"
  );

  const details = [
    date,
    game.location ? escapeMarkdown(game.location) : null,
    storyteller ? `Storyteller: ${escapeMarkdown(storyteller)}` : null,
    RESULTS[game.win_v2] ? `**${RESULTS[game.win_v2]}**` : null,
  ].filter(Boolean);

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  // The last grimoire page is the end-of-game state.
  const tokens = game.grimoire[game.grimoire.length - 1]?.tokens ?? [];

  let image: Buffer | null = null;
  // What the image couldn't show in full (names the font can't draw, more
  // bluffs/fabled than fit) still gets listed as text.
  let incomplete = { grimoire: true, demonBluffs: true, fabled: true };
  if (tokens.length > 0) {
    try {
      ({ png: image, incomplete } = await renderGrimoireImage({
        script: game.script,
        result: RESULTS[game.win_v2],
        resultColor:
          "#" + COLORS[game.win_v2].toString(16).padStart(6, "0"),
        date,
        storyteller: storyteller ?? null,
        tokens: tokens.map((token) => ({
          alignment: token.alignment,
          is_dead: token.is_dead,
          role: token.role,
          related_role: token.related_role,
          player_name: token.player?.display_name || token.player_name,
        })),
        demonBluffs: game.demon_bluffs,
        fabled: game.fabled,
      }));
    } catch (error) {
      console.error("Rendering grimoire image failed", gameId, error);
    }
  }

  const lines = tokens
    .filter((token) => token.role || token.player_name || token.player)
    .map((token) => {
      const name = token.player?.display_name || token.player_name;
      const role = token.role?.name ?? "Unknown";
      const text = [
        ALIGNMENT_MARKERS[token.alignment],
        token.is_dead ? `~~${escapeMarkdown(role)}~~ 💀` : `**${escapeMarkdown(role)}**`,
        name ? `- ${escapeMarkdown(name.replace(/^@/, ""))}` : null,
      ]
        .filter(Boolean)
        .join(" ");
      return text;
    });

  // Split the grimoire across as many fields as it needs. The image already
  // shows the grimoire, bluffs and fabled, so only list what it doesn't.
  let chunk: string[] = [];
  for (const line of incomplete.grimoire ? lines : []) {
    if ([...chunk, line].join("\n").length > FIELD_LIMIT) {
      fields.push({
        name: fields.length === 0 ? "Grimoire" : "​",
        value: chunk.join("\n"),
      });
      chunk = [];
    }
    chunk.push(line);
  }
  if (chunk.length > 0) {
    fields.push({
      name: fields.length === 0 ? "Grimoire" : "​",
      value: chunk.join("\n"),
    });
  }

  if (!game.is_storyteller && game.player_characters.length > 0) {
    fields.push({
      name: `${game.user?.display_name ?? "Player"} played`,
      value: game.player_characters
        .map((c) => `${ALIGNMENT_MARKERS[c.alignment]} ${escapeMarkdown(c.name)}`)
        .join(" → ")
        .slice(0, FIELD_LIMIT),
      inline: true,
    });
  }

  if (incomplete.demonBluffs && game.demon_bluffs.length > 0) {
    fields.push({
      name: "Demon bluffs",
      value: game.demon_bluffs
        .map((b) => escapeMarkdown(b.name))
        .join(", ")
        .slice(0, FIELD_LIMIT),
      inline: true,
    });
  }

  if (incomplete.fabled && game.fabled.length > 0) {
    fields.push({
      name: "Fabled",
      value: game.fabled
        .map((f) => escapeMarkdown(f.name))
        .join(", ")
        .slice(0, FIELD_LIMIT),
      inline: true,
    });
  }

  const payload = {
    // Player names are free text, so never let them ping anyone.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: (game.script || "Custom script").slice(0, 256),
        url: `${origin}/game/${gameId}`,
        description: details.join("\n"),
        color: COLORS[game.win_v2],
        author: game.user
          ? {
              name: (game.user.display_name || game.user.username).slice(0, 256),
              url: `${origin}/@${game.user.username}`,
              icon_url: absolute(game.user.avatar),
            }
          : undefined,
        thumbnail: {
          url: absolute(
            game.associated_script?.logo ??
              BASE_SCRIPT_LOGOS[game.script] ??
              "/img/custom-script.webp"
          ),
        },
        image: image ? { url: "attachment://grimoire.png" } : undefined,
        fields: trimFields(fields),
        footer: {
          text: "ClockTracker",
        },
        timestamp: game.date.toISOString(),
      },
    ],
  };

  let body: string | FormData;
  if (image) {
    body = new FormData();
    body.append(
      "payload_json",
      JSON.stringify({
        ...payload,
        attachments: [{ id: 0, filename: "grimoire.png" }],
      })
    );
    body.append(
      "files[0]",
      new Blob([image], { type: "image/png" }),
      "grimoire.png"
    );
  } else {
    body = JSON.stringify(payload);
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    // fetch sets the multipart boundary itself.
    headers: image ? undefined : { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    console.error(
      "Discord webhook failed",
      response.status,
      await response.text()
    );
    throw createError({
      status: 502,
      statusMessage: "Discord rejected the post",
    });
  }

  return true;
});
