import "server-only";

import type { NextResponse } from "next/server";
import type { z } from "zod";

import { apiError, readJson, withErrors } from "../api/http";
import { actorOf, requireApiUser, type SessionUser } from "../auth/guard";
import type { Role } from "../auth/session";
import { getSeason } from "../catalog/season-store";
import { requireStore, type Store } from "../storage/env";
import { DraftError } from "./drafts";
import { OpError, type OpContext } from "./ops";
import { PublishValidationError } from "./publish";
import { DuplicateSourceError, InvalidSourceError } from "./sources";

export interface AdminCtx {
  user: SessionUser;
  store: Store;
  op: OpContext;
}

/** Bungkus Route Handler pentadbir: sesi + peranan, stor, dan pemetaan ralat domain. */
export function adminRoute(
  req: Request,
  role: Role | "any",
  fn: (c: AdminCtx) => Promise<NextResponse>,
): Promise<NextResponse> {
  return withErrors(async () => {
    const { user, error } = await requireApiUser(req, role);
    if (error) return error;
    const store = requireStore();
    try {
      return await fn({
        user,
        store,
        op: { actor: actorOf(user), now: new Date(), role: user.role },
      });
    } catch (e) {
      if (e instanceof OpError || e instanceof DraftError) {
        return apiError(422, "validation_failed", e.message);
      }
      if (e instanceof PublishValidationError) {
        return apiError(422, "validation_failed", e.message, e.problems.slice(0, 100));
      }
      if (e instanceof DuplicateSourceError) {
        return apiError(409, "conflict", e.message, { sha256: e.existing.sha256 });
      }
      if (e instanceof InvalidSourceError) {
        return apiError(415, "unsupported_media_type", e.message);
      }
      throw e;
    }
  });
}

/** Baca dan sahkan badan JSON dengan skema Zod. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T, maxBytes = 32_000) {
  const body = await readJson(req, maxBytes);
  if (!body.ok) return { data: null, error: body.response };
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return {
      data: null,
      error: apiError(
        422,
        "validation_failed",
        "Permintaan tidak sah.",
        parsed.error.issues
          .slice(0, 20)
          .map((i) => ({ field: i.path.join("."), message: i.message })),
      ),
    };
  }
  return { data: parsed.data as z.infer<T>, error: null };
}

export async function requireSeason(id: string) {
  const s = await getSeason(id);
  if (!s) throw new DraftError(`Musim ${id} tidak wujud.`);
  return s;
}
