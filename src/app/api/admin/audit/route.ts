import { NextResponse } from "next/server";

import { adminRoute } from "@/lib/admin/api";
import { apiError } from "@/lib/api/http";
import { listAuditEvents } from "@/lib/storage/catalog-repo";

/** GET /api/admin/audit?month=YYYY-MM — log audit (terkini dahulu). */
export async function GET(req: Request) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const month = new URL(req.url).searchParams.get("month") ?? op.now.toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return apiError(400, "bad_request", "Bulan mesti YYYY-MM.");
    const events = await listAuditEvents(store.kv, month);
    return NextResponse.json({ month, events: events.reverse() });
  });
}
