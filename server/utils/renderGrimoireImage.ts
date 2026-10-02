import sharp from "sharp";
import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Draws the end-of-game grimoire as a PNG, laid out like components/Grimoire.vue:
// tokens around a circle starting at the top and going clockwise, with the
// script, result and date in the middle. Used for the Discord post.

type AlignmentLike = "GOOD" | "EVIL" | "NEUTRAL" | string;

export type GrimoireImageRole = {
  id: string;
  name: string;
  token_url: string | null;
  type: string | null;
  initial_alignment: AlignmentLike | null;
  custom_role: boolean | null;
};

export type GrimoireImageToken = {
  alignment: AlignmentLike;
  is_dead: boolean;
  role: GrimoireImageRole | null;
  related_role: GrimoireImageRole | null;
  player_name: string | null;
};

export type GrimoireImageInput = {
  script: string;
  result: string | null;
  resultColor: string;
  date: string;
  storyteller: string | null;
  tokens: GrimoireImageToken[];
  demonBluffs: { name: string; role: GrimoireImageRole | null }[];
  fabled: { name: string; role: GrimoireImageRole | null }[];
};

const WIDTH = 1200;
const HEIGHT = 1200;
const FONT = "DejaVu Sans, Verdana, Arial, sans-serif";

const ALIGNMENT_COLORS: Record<string, string> = {
  GOOD: "#3b82f6",
  EVIL: "#dc2626",
  NEUTRAL: "#9ca3af",
};

// ---------------------------------------------------------------------------
// Static files

let publicImgDir: string | null | undefined;

// Static files are served from .output/public in production (copied from
// public/), so look there first and fall back to the source tree.
function imgDir() {
  if (publicImgDir === undefined) {
    publicImgDir = null;
    for (const candidate of [
      path.join(process.cwd(), ".output", "public", "img"),
      path.join(process.cwd(), "public", "img"),
    ]) {
      if (existsSync(candidate)) {
        publicImgDir = realpathSync(candidate);
        break;
      }
    }
  }
  return publicImgDir;
}

// Resolves a site path like /img/role/160x160/imp.webp to a file on disk, only
// ever inside the public img directory.
function localImagePath(urlPath: string) {
  const root = imgDir();
  if (!root) return null;
  const clean = urlPath.split(/[?#]/)[0];
  if (!clean.startsWith("/img/") || clean.includes("\0")) return null;
  const resolved = path.resolve(root, "." + clean.slice("/img".length));
  if (!resolved.startsWith(root + path.sep)) return null;
  if (!/\.(png|webp|jpe?g)$/i.test(resolved)) return null;
  if (!existsSync(resolved)) return null;
  // Guard against symlinks pointing outside the img directory.
  const real = realpathSync(resolved);
  if (!real.startsWith(root + path.sep)) return null;
  return real;
}

const fileCache = new Map<string, Promise<Buffer | null>>();

function readImage(urlPath: string) {
  const file = localImagePath(urlPath);
  if (!file) return Promise.resolve(null);
  if (!fileCache.has(file)) {
    fileCache.set(
      file,
      readFile(file).catch(() => {
        fileCache.delete(file);
        return null;
      })
    );
  }
  return fileCache.get(file)!;
}

// Mirrors composables/useRoleImage.ts.
const normalizeRoleId = (id?: string | null) => id?.replace(/[_-]/g, "");
const isRoleAssetUrl = (url?: string | null) =>
  url?.startsWith("/img/role/") ?? false;
const isPlaceholderTokenUrl = (url?: string | null) => {
  const trimmed = url?.trim();
  return !trimmed || trimmed === "/1x1.png";
};
const isCustomRole = (role: GrimoireImageRole) => {
  if (role.custom_role != null) return !!role.custom_role;
  const url = role.token_url?.trim();
  if (isPlaceholderTokenUrl(url)) return false;
  return !isRoleAssetUrl(url);
};

function alignmentSuffix(role: GrimoireImageRole, alignment?: AlignmentLike) {
  if (!alignment || alignment === "NEUTRAL") return "";
  if (role.type === "FABLED" || role.type === "LORIC") return "";
  const initial =
    role.initial_alignment ??
    (role.type === "TRAVELER"
      ? "NEUTRAL"
      : role.type === "TOWNSFOLK" || role.type === "OUTSIDER"
      ? "GOOD"
      : role.type === "MINION" || role.type === "DEMON"
      ? "EVIL"
      : "NEUTRAL");
  if (initial === "NEUTRAL" || initial !== alignment) {
    return alignment === "GOOD" ? "_g" : "_e";
  }
  return "";
}

// Custom roles keep whatever art they point to. Remote art is not fetched
// (server-side fetches of user-supplied URLs are an SSRF risk), so those get
// a plain token with the role's name instead.
async function roleImage(role: GrimoireImageRole, alignment?: AlignmentLike) {
  if (isCustomRole(role)) {
    const url = role.token_url?.trim();
    return url?.startsWith("/img/") ? readImage(url) : null;
  }
  const id = normalizeRoleId(role.id);
  if (!id || !/^[a-z0-9]+$/i.test(id)) return null;
  const suffix = alignmentSuffix(role, alignment);
  for (const candidate of [
    `/img/role/160x160/${id}${suffix}.webp`,
    `/img/role/160x160/${id}.webp`,
    `/img/role/${id}${suffix}.webp`,
    `/img/role/${id}.webp`,
  ]) {
    const image = await readImage(candidate);
    if (image) return image;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Text helpers

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Invisible characters: control codes, zero-width joiners, direction marks,
// variation selectors.
const INVISIBLE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufe00-\ufe0f]/g;
const ASTRAL = /[\u{10000}-\u{10FFFF}]/gu;
// The only font on the server is DejaVu Sans. Stick to the blocks it covers
// well (Latin, Greek, Cyrillic, punctuation and common symbols); anything
// else (CJK, Thai, Devanagari, ...) would render as a box.
const UNDRAWABLE = /[^\u0020-\u007e\u00a0-\u052f\u1e00-\u1fff\u2010-\u205e\u20a0-\u20bf\u2100-\u2bff]/gu;

// Whether the image can show this text as written. Emoji are dropped quietly
// but still count as not drawable.
export function fontCanDraw(text: string | null | undefined) {
  UNDRAWABLE.lastIndex = 0;
  return !UNDRAWABLE.test((text ?? "").replace(INVISIBLE, ""));
}

function cleanText(text: string | null | undefined) {
  return (text ?? "")
    .replace(INVISIBLE, "")
    .replace(ASTRAL, "")
    .replace(UNDRAWABLE, "?")
    .replace(/\?{2,}/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

// Rough text width for DejaVu Sans (bold is a bit wider).
// DejaVu Sans advance widths for printable ASCII (space to ~), in 1/1000 em.
// Anything else uses a slightly generous average so it doesn't overflow.
const ASCII_WIDTHS = {
  regular: "318,400,460,838,636,950,780,274,390,390,500,838,318,360,318,336,636,636,636,636,636,636,636,636,636,636,336,336,838,838,838,530,1000,711,686,698,770,631,575,775,752,294,294,655,557,863,748,787,603,787,695,635,594,732,684,988,685,610,685,390,336,390,838,500,500,613,635,549,635,615,352,635,634,278,278,579,278,974,634,611,635,635,394,521,392,634,592,818,592,592,525,636,336,636,838"
    .split(",")
    .map(Number),
  bold: "348,456,521,838,696,1002,872,306,457,457,523,838,380,415,380,365,696,696,696,696,696,696,696,696,696,696,400,400,838,838,838,580,1000,774,762,733,830,683,683,821,837,372,372,775,637,995,837,850,733,850,770,677,704,812,774,1103,771,724,725,457,365,457,838,500,500,674,716,593,716,678,435,716,712,343,343,665,343,1042,712,687,716,716,493,595,478,712,652,923,645,652,582,712,365,712,838"
    .split(",")
    .map(Number),
};

const textWidth = (text: string, size: number, bold = false) => {
  const widths = bold ? ASCII_WIDTHS.bold : ASCII_WIDTHS.regular;
  let total = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    total += code >= 32 && code < 127 ? widths[code - 32] : bold ? 760 : 700;
  }
  return (total / 1000) * size;
};

// Font size at which text fills maxWidth. Slightly under the exact value so
// fitText never trips over float rounding and truncates text that fits.
const sizeToFit = (text: string, maxWidth: number, bold = false) =>
  (maxWidth / textWidth(text, 1, bold)) * 0.98;

// librsvg ignores dominant-baseline, so vertically centred text needs its
// baseline set by hand: DejaVu's mixed-case text sits ~0.36em below centre.
const centredBaseline = (centreY: number, size: number) => centreY + size * 0.36;

function fitText(text: string, size: number, maxWidth: number, bold = false) {
  if (textWidth(text, size, bold) <= maxWidth + 0.5) return text;
  const chars = [...text];
  while (chars.length > 1 && textWidth(chars.join("") + "\u2026", size, bold) > maxWidth + 0.5) {
    chars.pop();
  }
  return chars.join("").trimEnd() + "\u2026";
}

// Splits at the space closest to the middle, or returns null for one word.
function splitInTwo(text: string): [string, string] | null {
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index!);
  if (spaces.length === 0) return null;
  const mid = text.length / 2;
  const at = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [text.slice(0, at), text.slice(at + 1)];
}

// One or two lines of text that fit maxWidth without truncating, shrinking
// down to minSize first and only then wrapping. A single word that's still
// too long keeps shrinking rather than being cut off.
function fitLines(text: string, maxSize: number, minSize: number, maxWidth: number, bold = false) {
  const single = Math.min(maxSize, sizeToFit(text, maxWidth, bold));
  if (single >= minSize) return { size: single, lines: [text] };
  const split = splitInTwo(text);
  if (!split) return { size: single, lines: [text] };
  const longest = split[0].length > split[1].length ? split[0] : split[1];
  const size = Math.min(maxSize, sizeToFit(longest, maxWidth, bold));
  return { size, lines: split };
}

const textAttrs = (size: number, bold: boolean) =>
  `font-family="${FONT}" font-size="${size.toFixed(1)}"${bold ? ' font-weight="bold"' : ""}`;

// ---------------------------------------------------------------------------
// Token drawing

async function tokenImage(
  size: number,
  role: GrimoireImageRole | null,
  alignment: AlignmentLike | undefined,
  dead: boolean,
  tokenBg: Buffer
) {
  const layers: sharp.OverlayOptions[] = [];
  const art = role ? await roleImage(role, alignment) : null;
  if (art) {
    const artSize = Math.round(size * 0.68);
    layers.push({
      input: await sharp(art).resize(artSize, artSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      left: Math.round((size - artSize) / 2),
      top: Math.round((size - artSize) / 2 - size * 0.08),
    });
  }

  let token = sharp(
    await sharp(tokenBg).resize(size, size).composite(layers).png().toBuffer()
  );
  if (dead) {
    token = token.grayscale().modulate({ brightness: 0.85 });
  }
  return token.png().toBuffer();
}

// A circular badge so roles without art (custom or unknown) still read well.
function placeholderSvg(cx: number, cy: number, size: number, name: string) {
  const initial = escapeXml([...name][0]?.toUpperCase() ?? "?");
  return `<text x="${cx}" y="${centredBaseline(cy - size * 0.06, Math.round(size * 0.34)).toFixed(1)}" font-family="${FONT}" font-size="${Math.round(size * 0.34)}" font-weight="bold" fill="#3f3f46" fill-opacity="0.55" text-anchor="middle">${initial}</text>`;
}

// ---------------------------------------------------------------------------

const MAX_PER_ROW = 4;
const MAX_ROWS = 2;

export type GrimoireImageResult = {
  png: Buffer;
  // Parts the image couldn't show in full (names in scripts the font can't
  // draw, or more bluffs/fabled than fit), so the caller can list them as text.
  incomplete: { grimoire: boolean; demonBluffs: boolean; fabled: boolean };
};

export async function renderGrimoireImage(
  input: GrimoireImageInput
): Promise<GrimoireImageResult> {
  const tokenBg = await readImage("/img/token-bg.webp");
  const shroud = await readImage("/img/shroud.png");
  if (!tokenBg) {
    throw new Error("Token background image not found");
  }

  const tokens = input.tokens;
  const n = tokens.length;
  if (n === 0) {
    throw new Error("Grimoire has no tokens");
  }

  // Token diameter and seat radius: as large as fits, leaving room for the
  // shroud above and the name tag below each token.
  const MAX_D = 240;
  let d = MAX_D;
  let r = 0;
  for (let i = 0; i < 6; i++) {
    r = WIDTH / 2 - d / 2 - 46;
    d = Math.min(MAX_D, n > 1 ? ((2 * Math.PI * r) / n) * 0.85 : MAX_D);
  }
  d = Math.round(d);
  r = WIDTH / 2 - d / 2 - 46;
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 + 6;
  // Distance between neighbouring seat centres.
  const seatGap = n > 1 ? 2 * r * Math.sin(Math.PI / n) : WIDTH;

  const composites: sharp.OverlayOptions[] = [];
  const svgParts: string[] = [];
  const topLayer: sharp.OverlayOptions[] = [];
  // Name tags and the centre text go above shrouds and related tokens so
  // they're never covered by a neighbouring seat.
  const labelParts: string[] = [];

  const seats = tokens.map((token, i) => {
    // Same seating as Grimoire.vue: seat 0 at the top, clockwise.
    const angle = (i / n - 0.25) * 2 * Math.PI;
    return {
      token,
      angle,
      x: Math.round(cx + r * Math.cos(angle)),
      y: Math.round(cy + r * Math.sin(angle)),
    };
  });

  // Draw seats in parallel but keep their layers in seat order.
  const drawn = await Promise.all(
    seats.map(async ({ token, angle, x, y }) => {
      const composites: sharp.OverlayOptions[] = [];
      const svgParts: string[] = [];
      const topLayer: sharp.OverlayOptions[] = [];
      const labelParts: string[] = [];
      const left = Math.round(x - d / 2);
      const top = Math.round(y - d / 2);
      const image = await tokenImage(d, token.role, token.alignment, token.is_dead, tokenBg);
      composites.push({ input: image, left, top });

      const color = ALIGNMENT_COLORS[token.alignment] ?? ALIGNMENT_COLORS.NEUTRAL;
      const hasArt = token.role ? !!(await roleImage(token.role, token.alignment)) : false;

      // Alignment ring, full strength even for the dead (the grey token,
      // shroud and dagger already mark death).
      svgParts.push(
        `<circle cx="${x}" cy="${y}" r="${d / 2 + 2}" fill="none" stroke="${color}" stroke-width="${Math.max(4, Math.round(d * 0.035))}"/>`
      );

      const roleName = cleanText(token.role?.name);
      if (token.role && !hasArt) {
        svgParts.push(placeholderSvg(x, y, d, roleName));
      }

      // Role name across the bottom of the token, wrapped onto two lines
      // rather than shrunk below legibility. (librsvg can't draw textPath, so
      // it's straight rather than curved like Token.vue.)
      if (roleName) {
        const { size: fs, lines } = fitLines(roleName, d * 0.13, Math.max(18, d * 0.1), d * 0.9, true);
        const ys = lines.length === 1 ? [y + d * 0.33] : [y + d * 0.38 - fs * 1.05, y + d * 0.38];
        lines.forEach((line, k) => {
          svgParts.push(
            `<text x="${x}" y="${ys[k].toFixed(1)}" ${textAttrs(fs, true)} fill="#18181b" stroke="#efe6d2" stroke-width="${(fs * 0.22).toFixed(1)}" stroke-linejoin="round" paint-order="stroke" text-anchor="middle">${escapeXml(line)}</text>`
          );
        });
      }

      // Player name tag under the token, at most as wide as the gap between
      // seats. Seats on the left and right are pushed outwards, away from the
      // neighbour directly below them. Dead
      // players without a name still get a dagger tag.
      const player = cleanText(token.player_name?.replace(/^@/, ""));
      if (player || token.is_dead) {
        const fs = Math.max(21, Math.min(28, d * 0.125));
        const maxWidth = Math.min(d * 1.5, seatGap - 8);
        const text = player ? (token.is_dead ? `\u2020 ${player}` : player) : "\u2020";
        const label = fitText(text, fs, maxWidth - fs, true);
        const w = Math.min(maxWidth, textWidth(label, fs, true) + fs * 1.1);
        const h = fs * 1.55;
        const side = Math.cos(angle);
        const ty = Math.min(HEIGHT - h - 4, y + d / 2 - h * 0.25);
        const px = Math.min(WIDTH - w / 2 - 4, Math.max(w / 2 + 4, x + side * d * 0.3));
        labelParts.push(
          `<rect x="${(px - w / 2).toFixed(1)}" y="${ty.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}" fill="${token.is_dead ? "#3f3f46" : "#0b0b0f"}" fill-opacity="0.92" stroke="${color}" stroke-width="2"/>`,
          `<text x="${px.toFixed(1)}" y="${centredBaseline(ty + h / 2, fs).toFixed(1)}" ${textAttrs(fs, true)} fill="${token.is_dead ? "#d4d4d8" : "#ffffff"}" text-anchor="middle">${escapeXml(label)}</text>`
        );
      }

      // Related role (e.g. what the Drunk thinks they are) as a small token
      // on the token's outer side, away from the centre text.
      if (token.related_role) {
        const rs = Math.round(d * 0.4);
        const rimg = await tokenImage(rs, token.related_role, undefined, false, tokenBg);
        const rl = Math.round(
          Math.cos(angle) > 0.01
            ? Math.min(WIDTH - rs, x + d / 2 - rs * 0.65)
            : Math.max(0, x - d / 2 - rs * 0.35)
        );
        const rtop = Math.round(y - rs * 0.15);
        topLayer.push({ input: rimg, left: rl, top: rtop });
        svgParts.push(
          `<circle cx="${rl + rs / 2}" cy="${rtop + rs / 2}" r="${rs / 2 + 1}" fill="none" stroke="#0b0b0f" stroke-width="3"/>`
        );
      }

      // Shroud over dead players, kept narrow and high so the art shows.
      if (token.is_dead && shroud) {
        const sw = Math.round(d * 0.3);
        const sh = Math.round((sw * 200) / 143);
        topLayer.push({
          input: await sharp(shroud).resize(sw, sh).png().toBuffer(),
          left: Math.round(x - sw / 2),
          top: Math.max(0, Math.round(y - d / 2 - sh * 0.42)),
        });
      }
      return { composites, svgParts, topLayer, labelParts };
    })
  );
  for (const seat of drawn) {
    composites.push(...seat.composites);
    svgParts.push(...seat.svgParts);
    topLayer.push(...seat.topLayer);
    labelParts.push(...seat.labelParts);
  }

  // Centre: script, result, date, storyteller, then bluffs and fabled. The
  // block is sized to fit inside the ring (clear of the top seat's name tag
  // and the bottom seat's shroud) and centred vertically.
  const inner = r - d / 2 - 44;
  // Usable width at a height dy from the centre. The sides have no tags or
  // shrouds poking in, so widths can use a slightly larger circle.
  const innerSide = r - d / 2 - 10;
  const chordAt = (dy: number) =>
    2 * Math.sqrt(Math.max(0, innerSide * innerSide - dy * dy)) - 16;

  const script = cleanText(input.script) || "Custom script";
  const scriptFit = fitLines(script, 54, 36, inner * 1.4, true);
  const storyteller = cleanText(input.storyteller?.replace(/^@/, ""));

  // Each row: its gap from the previous baseline, and how to draw it.
  const textRows: { gap: number; render: (y: number) => string }[] = [];
  scriptFit.lines.forEach((line) => {
    textRows.push({
      gap: scriptFit.size * 1.15,
      render: (y) =>
        `<text x="${cx}" y="${y.toFixed(1)}" ${textAttrs(scriptFit.size, true)} fill="#f4f4f5" text-anchor="middle">${escapeXml(line)}</text>`,
    });
  });
  if (input.result) {
    textRows.push({
      gap: 74,
      render: (y) =>
        `<text x="${cx}" y="${y.toFixed(1)}" ${textAttrs(64, true)} fill="${input.resultColor}" text-anchor="middle">${escapeXml(input.result!)}</text>`,
    });
  }
  textRows.push({
    gap: 46,
    render: (y) =>
      `<text x="${cx}" y="${y.toFixed(1)}" ${textAttrs(32, false)} fill="#d4d4d8" text-anchor="middle">${escapeXml(cleanText(input.date))}</text>`,
  });
  if (storyteller) {
    textRows.push({
      gap: 40,
      render: (y) =>
        `<text x="${cx}" y="${y.toFixed(1)}" ${textAttrs(28, false)} fill="#a1a1aa" text-anchor="middle">${escapeXml(fitText(`Storyteller: ${storyteller}`, 28, inner * 1.6, false))}</text>`,
    });
  }

  // Bluffs and fabled: up to MAX_PER_ROW tokens per row and MAX_ROWS rows
  // each; anything beyond that is reported so the caller lists it as text.
  // When both are short they share one row, side by side.
  type Segment = { label: string; items: GrimoireImageInput["fabled"] };
  const groups = [
    { key: "demonBluffs" as const, label: "Demon bluffs", items: input.demonBluffs },
    { key: "fabled" as const, label: "Fabled", items: input.fabled },
  ].filter((group) => group.items.length > 0);
  const shown = { demonBluffs: 0, fabled: 0 };
  const tokenRows: Segment[][] = [];
  if (
    groups.length === 2 &&
    groups[0].items.length + groups[1].items.length <= MAX_PER_ROW + 1
  ) {
    tokenRows.push(groups.map((g) => ({ label: g.label, items: g.items })));
    for (const g of groups) shown[g.key] = g.items.length;
  } else {
    for (const g of groups) {
      const items = g.items.slice(0, MAX_PER_ROW * MAX_ROWS);
      shown[g.key] = items.length;
      for (let k = 0; k < items.length; k += MAX_PER_ROW) {
        tokenRows.push([{ label: k === 0 ? g.label : "", items: items.slice(k, k + MAX_PER_ROW) }]);
      }
    }
  }

  const FIRST_LINE = scriptFit.size * 0.8;
  const textHeight = FIRST_LINE + textRows.slice(1).reduce((sum, row) => sum + row.gap, 0) + 14;
  const LABEL_H = 34;
  const CAPTION_H = 50;
  const SEGMENT_GAP = 40;
  // Each caption gets at least 100px, so small tokens are spaced further apart.
  const tokenGap = (small: number) => Math.max(20, 100 - small);
  const labelHeight = (row: Segment[]) => (row.some((s) => s.label) ? LABEL_H : 0);
  const blockHeight = (small: number) =>
    textHeight +
    tokenRows.reduce((sum, row) => sum + 12 + labelHeight(row) + small + CAPTION_H, 0);
  const rowWidth = (row: Segment[], small: number) =>
    row.reduce((sum, s) => sum + s.items.length * small + (s.items.length - 1) * tokenGap(small), 0) +
    (row.length - 1) * SEGMENT_GAP;

  const layoutFits = (small: number) => {
    const height = blockHeight(small);
    if (height > inner * 2) return false;
    let y = cy - height / 2 + textHeight;
    for (const row of tokenRows) {
      y += 12 + labelHeight(row);
      const worst = Math.max(Math.abs(y - cy), Math.abs(y + small - cy));
      if (rowWidth(row, small) > chordAt(worst)) return false;
      y += small + CAPTION_H;
    }
    return true;
  };
  let small = 110;
  while (tokenRows.length > 0 && small > 56 && !layoutFits(small)) small -= 2;

  let lineY = cy - blockHeight(small) / 2 + FIRST_LINE;
  textRows.forEach((row, k) => {
    if (k > 0) lineY += row.gap;
    labelParts.push(row.render(lineY));
  });
  let rowY = lineY + 14;

  const gap = tokenGap(small);
  for (const row of tokenRows) {
    rowY += 12;
    let left = cx - rowWidth(row, small) / 2;
    for (const segment of row) {
      const segWidth = segment.items.length * small + (segment.items.length - 1) * gap;
      if (segment.label) {
        svgParts.push(
          `<text x="${(left + segWidth / 2).toFixed(1)}" y="${rowY + 22}" ${textAttrs(22, true)} fill="#a1a1aa" text-anchor="middle" letter-spacing="1">${escapeXml(segment.label.toUpperCase())}</text>`
        );
      }
      const top = Math.round(rowY + labelHeight(row));
      for (const [j, item] of segment.items.entries()) {
        const x0 = Math.round(left + j * (small + gap));
        const image = await tokenImage(small, item.role, undefined, false, tokenBg);
        composites.push({ input: image, left: x0, top });
        const name = cleanText(item.role?.name || item.name);
        if (item.role && !(await roleImage(item.role))) {
          svgParts.push(placeholderSvg(x0 + small / 2, top + small / 2, small, name));
        }
        const { size: fs, lines } = fitLines(name, 20, 17, small + gap - 6);
        lines.forEach((line, k) => {
          svgParts.push(
            `<text x="${x0 + small / 2}" y="${(top + small + 20 + k * fs * 1.1).toFixed(1)}" ${textAttrs(fs, false)} fill="#e4e4e7" text-anchor="middle">${escapeXml(line)}</text>`
          );
        });
      }
      left += segWidth + SEGMENT_GAP;
    }
    rowY += labelHeight(row) + small + CAPTION_H;
  }

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
<defs><radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#27272a"/><stop offset="100%" stop-color="#09090b"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3f3f46" stroke-width="2" stroke-dasharray="6 10"/>
</svg>`;
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${svgParts.join("\n")}</svg>`;
  const labels = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${labelParts.join("\n")}</svg>`;

  const png = await sharp(Buffer.from(background))
    .composite([
      ...composites,
      { input: Buffer.from(overlay), left: 0, top: 0 },
      ...topLayer,
      { input: Buffer.from(labels), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  const groupIncomplete = (key: "demonBluffs" | "fabled") =>
    shown[key] < input[key].length ||
    input[key].some((item) => !fontCanDraw(item.role?.name || item.name));

  return {
    png,
    incomplete: {
      grimoire: tokens.some(
        (token) =>
          !fontCanDraw(token.player_name) ||
          !fontCanDraw(token.role?.name) ||
          !fontCanDraw(token.related_role?.name)
      ),
      demonBluffs: groupIncomplete("demonBluffs"),
      fabled: groupIncomplete("fabled"),
    },
  };
}
