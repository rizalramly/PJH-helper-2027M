import { beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), list: vi.fn() }));
vi.mock("@vercel/blob", async (orig) => {
  const actual = await orig<typeof import("@vercel/blob")>();
  return { ...actual, put: blob.put, get: blob.get, list: blob.list };
});

import { BlobPreconditionFailedError } from "@vercel/blob";

import { BlobKV } from "@/lib/storage/blob-kv";
import { ConflictError } from "@/lib/storage/kv";

describe("BlobKV", () => {
  beforeEach(() => vi.resetAllMocks());
  const kv = new BlobKV("vercel_blob_rw_test_secret");

  it("menulis JSON private tanpa akhiran rawak; ifMatch dihantar", async () => {
    blob.put.mockResolvedValue({ etag: '"e2"' });
    await expect(kv.putJSON("a.json", { x: 1 }, { ifMatch: '"e1"' })).resolves.toEqual({
      etag: '"e2"',
    });
    expect(blob.put).toHaveBeenCalledWith(
      "a.json",
      '{"x":1}',
      expect.objectContaining({
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        ifMatch: '"e1"',
      }),
    );
  });

  it("createOnly tidak membenarkan tulis ganti", async () => {
    blob.put.mockResolvedValue({ etag: '"e1"' });
    await kv.putJSON("b.json", {}, { createOnly: true });
    expect(blob.put.mock.calls[0][2]).toMatchObject({ allowOverwrite: false });
  });

  it("menukar ralat prasyarat Blob kepada ConflictError", async () => {
    blob.put.mockRejectedValue(new BlobPreconditionFailedError());
    await expect(kv.putJSON("a.json", {}, { ifMatch: '"lama"' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("membaca JSON private tanpa cache dan memulangkan null jika tiada", async () => {
    blob.get.mockResolvedValueOnce({
      statusCode: 200,
      stream: new Response('{"v":2}').body,
      blob: { etag: '"e9"' },
    });
    await expect(kv.getJSON("c.json")).resolves.toEqual({ value: { v: 2 }, etag: '"e9"' });
    expect(blob.get).toHaveBeenCalledWith(
      "c.json",
      expect.objectContaining({ access: "private", useCache: false }),
    );
    blob.get.mockResolvedValueOnce(null);
    await expect(kv.getJSON("d.json")).resolves.toBeNull();
  });

  it("menyenaraikan semua halaman list", async () => {
    blob.list
      .mockResolvedValueOnce({ blobs: [{ pathname: "p/b" }], hasMore: true, cursor: "c1" })
      .mockResolvedValueOnce({ blobs: [{ pathname: "p/a" }], hasMore: false });
    await expect(kv.list("p/")).resolves.toEqual(["p/a", "p/b"]);
  });
});
