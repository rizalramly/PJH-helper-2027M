import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("menggabungkan kelas dan menyelesaikan konflik Tailwind", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});
