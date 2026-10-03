// Ujian integrasi API (tanpa BLOB_READ_WRITE_TOKEN → katalog dibaca daripada repo).
import { describe, expect, it } from "vitest";

import { POST as assessPOST } from "@/app/api/assess/route";
import { GET as packagesGET } from "@/app/api/catalog/packages/route";
import { GET as pjhsGET } from "@/app/api/catalog/pjhs/route";
import { GET as seasonsGET } from "@/app/api/catalog/seasons/route";
import { GET as variantGET } from "@/app/api/catalog/variants/[id]/route";
import { POST as comparePOST } from "@/app/api/compare/route";
import { GET as coverageGET } from "@/app/api/coverage/route";
import { FORBIDDEN_WORDS } from "@/lib/engine/explain";

const post = (body: unknown) =>
  new Request("http://test/api", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const get = (path: string) => new Request(`http://test${path}`);

const scenarioA = {
  seasonId: "1448H",
  rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }],
  budget: { perPersonRM: "RM100,000" },
  aziziyah: { mode: "required", acceptConditional: true },
  pmn: "required",
  tarwiyah: { mode: "required", acceptConditional: true },
  duration: { target: 40, tolerance: 0, acceptApproximate: true },
};

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("POST /api/assess", () => {
  it("senario A: kos rujukan tepat, versi data dan cadangan dipulangkan", async () => {
    const res = await assessPOST(post({ requirements: scenarioA }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-dataset-version")).toMatch(/^ds-1448h-/);
    const text = await res.text();
    expect(text.length).toBeLessThan(2_000_000);
    expect(text).not.toMatch(FORBIDDEN_WORDS);
    const body: Json = JSON.parse(text);
    expect(body).toMatchObject({
      seasonId: "1448H",
      scoringRulesVersion: "v1",
      engineVersion: "1.0.0",
    });
    expect(body.datasetVersion).toBe(res.headers.get("x-dataset-version"));
    const mtsp = body.candidates.find((c: Json) => c.assignments[0].variant.code === "MTSP02");
    expect(mtsp.cost.knownGroup).toEqual({ sen: "17298000", text: "RM 172,980.00" });
    expect(mtsp.cost.remaining.sen).toBe("2702000");
    expect(mtsp.assignments[0].perPerson.text).toBe("RM 86,490.00");
    expect(mtsp.group).toBe("full_match");
    expect(mtsp.pjh.approvalStatus).toBe("unverified");
    expect(mtsp.sources.length).toBeGreaterThan(0);
    expect(body.recommendations[0].label).toBe("CADANGAN_UTAMA");
    expect(body.counts.full_match).toBe(body.groups.full_match.length);
    expect(body.groups.not_matching.length).toBeLessThanOrEqual(10);
    expect(body.coverageSummary.totals.pjhExpected).toBe(34);
    expect(body.coverageSummary.pjhs.busyra).toMatchObject({
      processingStatus: "reviewed",
      approvalStatus: "unverified",
    });
    expect(body.coverageSummary.pjhs.busyra.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("tiada padanan: mesej, sebab dan calon terdekat", async () => {
    const res = await assessPOST(
      post({ requirements: { ...scenarioA, budget: { perPersonRM: 30000 } } }),
    );
    const body: Json = await res.json();
    expect(body.noMatch.message).toBe(
      "Tiada pakej yang memenuhi semua keperluan berdasarkan data tersedia",
    );
    expect(body.noMatch.nearest.length).toBeGreaterThan(0);
    for (const n of body.noMatch.nearest)
      expect(body.candidates.some((c: Json) => c.id === n.candidateId)).toBe(true);
  });

  it.each([
    ["JSON rosak", "{tidak sah", 400, "bad_request"],
    ["tiada bilik", { requirements: { ...scenarioA, rooms: [] } }, 422, "validation_failed"],
    [
      "RM tidak sah",
      { requirements: { ...scenarioA, budget: { perPersonRM: "seratus ribu" } } },
      422,
      "validation_failed",
    ],
    [
      "3 orang bilik berdua",
      {
        requirements: {
          ...scenarioA,
          rooms: [{ pilgrims: 3, makkah: 2, madinah: 2, aziziyah: null }],
        },
      },
      422,
      "validation_failed",
    ],
    [
      "musim tidak disokong",
      { requirements: { ...scenarioA, seasonId: "1450H" } },
      404,
      "not_found",
    ],
  ])("%s → %i", async (_, body, status, code) => {
    const res = await assessPOST(post(body));
    expect(res.status).toBe(status);
    const json: Json = await res.json();
    expect(json.error.code).toBe(code);
    expect(json.error.message).toBeTruthy();
  });

  it("ralat medan dalam BM", async () => {
    const res = await assessPOST(
      post({ requirements: { ...scenarioA, budget: { perPersonRM: "abc" } } }),
    );
    const json: Json = await res.json();
    expect(json.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "requirements.budget.perPersonRM",
          message: expect.stringMatching(/RM tidak sah/),
        }),
      ]),
    );
  });
});

describe("POST /api/compare", () => {
  it("membandingkan 2–3 calon dengan sebab beza harga", async () => {
    const assessed: Json = await (await assessPOST(post({ requirements: scenarioA }))).json();
    const ids = assessed.groups.full_match.slice(0, 3);
    const res = await comparePOST(post({ requirements: scenarioA, candidateIds: ids }));
    expect(res.status).toBe(200);
    const body: Json = await res.json();
    expect(body.candidateIds).toEqual(ids);
    expect(body.rows.find((r: Json) => r.key === "groupCost").values).toHaveLength(ids.length);
    expect(body.rows.some((r: Json) => r.key === "req:tarwiyah")).toBe(true);
    expect(body.priceDifferences.length).toBe(ids.length - 1);
    expect(body.priceDifferences.join(" ")).toMatch(/lebih mahal|sama harga/);
  });

  it("menolak lebih daripada 3 calon dan calon yang tidak wujud", async () => {
    const tooMany = await comparePOST(
      post({ requirements: scenarioA, candidateIds: ["a", "b", "c", "d"] }),
    );
    expect(tooMany.status).toBe(422);
    const missing = await comparePOST(
      post({ requirements: scenarioA, candidateIds: ["tiada::X", "tiada::Y"] }),
    );
    expect(missing.status).toBe(404);
  });
});

describe("GET katalog dan liputan", () => {
  it("musim", async () => {
    const body: Json = await (await seasonsGET()).json();
    expect(body.seasons.map((s: Json) => s.id)).toEqual(["1448H"]);
  });

  it("34 PJH, semua kelulusan belum disahkan", async () => {
    const res = await pjhsGET(get("/api/catalog/pjhs"));
    const body: Json = await res.json();
    expect(body.pjhs).toHaveLength(34);
    expect(body.pjhs.every((p: Json) => p.approvalStatus === "unverified")).toBe(true);
    expect(body.pjhs.find((p: Json) => p.id === "busyra")).toMatchObject({
      packageCount: 11,
      variantCount: 41,
    });
  });

  it("pakej satu PJH dengan varian; PJH tidak wujud → 404; musim tidak wujud → 404", async () => {
    const body: Json = await (await packagesGET(get("/api/catalog/packages?pjh=busyra"))).json();
    expect(body.packages).toHaveLength(11);
    expect(body.packages[0].variants[0].price.sen).toMatch(/^\d+$/);
    expect((await packagesGET(get("/api/catalog/packages?pjh=tiada"))).status).toBe(404);
    expect((await packagesGET(get("/api/catalog/packages?season=1999H"))).status).toBe(404);
  });

  it("butiran varian dengan naik taraf, caj dan bukti", async () => {
    const pk: Json = await (await packagesGET(get("/api/catalog/packages?pjh=busyra"))).json();
    const v = pk.packages.flatMap((p: Json) => p.variants).find((x: Json) => x.code === "MTSP02");
    const res = await variantGET(get(`/api/catalog/variants/${encodeURIComponent(v.id)}`), {
      params: Promise.resolve({ id: encodeURIComponent(v.id) }),
    });
    const body: Json = await res.json();
    expect(body.variant.price.sen).toBe("7799000");
    expect(body.variant.evidence[0].pdfPage).toBe(34);
    expect(body.upgrades.find((u: Json) => u.id === "busyra-aziziyah-bilik-berdua").price.sen).toBe(
      "850000",
    );
    expect(body.charges.find((c: Json) => c.id === "busyra-bayaran-haji-pjh").included).toBe(true);
    const missing = await variantGET(get("/api/catalog/variants/tiada"), {
      params: Promise.resolve({ id: "tiada" }),
    });
    expect(missing.status).toBe(404);
  });

  it("liputan", async () => {
    const body: Json = await (await coverageGET(get("/api/coverage"))).json();
    expect(body.source).toBe("repo");
    expect(body.coverage.pjhs).toHaveLength(34);
    expect(body.coverage.totals.pjhReviewed).toBeGreaterThan(0);
  });
});
