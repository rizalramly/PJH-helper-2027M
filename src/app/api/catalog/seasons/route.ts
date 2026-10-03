import { ok } from "@/lib/api/http";
import { SEASONS } from "@/lib/catalog/seasons";

/** GET /api/catalog/seasons */
export async function GET() {
  return ok({ seasons: SEASONS }, { cacheSeconds: 300 });
}
