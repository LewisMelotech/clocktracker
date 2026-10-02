import type { SupabaseUser as User } from "~/server/utils/supabaseUser";
import type { UserSettings } from "~/server/generated/prisma/client";
import { addUserKofiLevel } from "../utils/addUserKofiLevel";
import { prisma } from "~/server/utils/prisma";

export default defineEventHandler(async (handler) => {
  const user: User | null = handler.context.user;
  const body = await readBody<Partial<UserSettings> | null>(handler);

  if (!user) {
    throw createError({
      status: 401,
      statusMessage: "Unauthorized",
    });
  }

  if (!body) {
    throw createError({
      status: 400,
      statusMessage: "Bad Request",
    });
  }

  if (body.username === "") {
    throw createError({
      status: 409,
      statusMessage: "Username is required",
    });
  }

  if (body.username) {
    // Make sure that there are no spaces in the username.
    body.username = body.username.replaceAll(" ", "");

    const existingUser = await prisma.userSettings.findFirst({
      where: {
        username: {
          equals: body.username,
          mode: "insensitive",
        },
      },
    });

    if (existingUser && existingUser.user_id !== user.id) {
      throw createError({
        status: 409,
        statusMessage: "Username already exists",
      });
    }

    // Verify that the username contains only alphanumeric characters, underscores, and dashes.

    const usernameRegex = /^[a-zA-Z0-9\._-]*$/;

    if (!usernameRegex.test(body.username)) {
      throw createError({
        status: 409,
        statusMessage: "Username can only contain letters, numbers, periods, underscores, and dashes.",
      });
    }
  }

  // Only let users change their own profile fields. Spreading the raw body
  // previously let anyone set fields like is_admin or email on themselves.
  const editableFields = [
    "username",
    "display_name",
    "finished_welcome",
    "avatar",
    "pronouns",
    "bio",
    "location",
    "city_id",
    "privacy",
    "enable_bgstats",
    "opt_into_testing",
    "disable_tutorials",
  ] as const;

  const data: Partial<UserSettings> = {};
  for (const field of editableFields) {
    if (field in body) (data as any)[field] = body[field];
  }

  const settings = await prisma.userSettings.update({
    where: {
      user_id: user.id,
    },
    data,
  });

  return addUserKofiLevel(settings);
});
