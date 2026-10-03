import { describe, expect, it } from "vitest";

import { formatRM, parseRMToSen } from "@/lib/engine/money";

describe("money", () => {
  it("memformat sen kepada RM dua tempat perpuluhan", () => {
    expect(formatRM(8_649_000n)).toBe("RM 86,490.00");
    expect(formatRM(-498_000n)).toBe("-RM 4,980.00");
    expect(formatRM(5n)).toBe("RM 0.05");
  });
  it.each([
    ["86490", 8_649_000n],
    ["86,490", 8_649_000n],
    ["RM86,490.00", 8_649_000n],
    ["RM 100 000.5", 10_000_050n],
  ])("menghurai %s", (input, sen) => expect(parseRMToSen(input)).toBe(sen));
  it.each(["", "abc", "1.234", "-5"])("menolak %s", (input) =>
    expect(parseRMToSen(input)).toBeNull(),
  );
});
