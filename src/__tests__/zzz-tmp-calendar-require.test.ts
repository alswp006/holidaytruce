import { describe, it } from "vitest";

describe("tmp", () => {
  it("requires minimal ts", () => {
    try {
      require("@/pages/__tmpMinimal.ts");
    } catch (e) {
      console.log("ERR", (e as Error).stack);
      throw e;
    }
  });
});
