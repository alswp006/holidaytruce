import { describe, it } from "vitest";
import { mockAll } from "@/__tests__/__helpers__/mocks";

mockAll();

describe("tmp2", () => {
  it("requires __tmpMinimal.tsx (no JSX, imports tds-mobile)", () => {
    try {
      require("@/pages/__tmpMinimal.tsx");
    } catch (e) {
      console.log("ERR1", (e as Error).stack);
      throw e;
    }
  });

  it("requires ScreenScaffold (has JSX)", () => {
    try {
      require("@/components/ScreenScaffold.tsx");
    } catch (e) {
      console.log("ERR2", (e as Error).stack);
      throw e;
    }
  });

  it("requires CalendarPage (avoids JSX itself, imports ScreenScaffold)", () => {
    try {
      require("@/pages/CalendarPage.tsx");
    } catch (e) {
      console.log("ERR3", (e as Error).stack);
      throw e;
    }
  });
});
