import { describe, it } from "vitest";
import { mockAll } from "@/__tests__/__helpers__/mocks";
mockAll();
describe("scratch", () => {
  it("requires page", () => {
    try {
      require("@/pages/ScriptResultPage");
    } catch (e) {
      console.log("STACK", (e as Error).stack);
      throw e;
    }
  });
});
