import { describe, it, expect, vi } from "vitest";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { IAP } from "@apps-in-toss/web-framework";

mockAll();

describe("debug", () => {
  it("checks IAP mock shape", () => {
    console.log("typeof IAP.createOneTimePurchaseOrder:", typeof IAP.createOneTimePurchaseOrder);
    console.log("keys:", Object.keys(IAP.createOneTimePurchaseOrder as any));
    expect(typeof IAP.createOneTimePurchaseOrder).toBe("function");
  });
});
