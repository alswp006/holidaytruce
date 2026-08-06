import { describe, it } from "vitest";
import React from "react";
import { useLocation as testUseLocation } from "react-router-dom";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { DbgProbe } from "@/components/__DbgProbe";
import * as rrdSrc from "react-router-dom";

mockTds();
mockAppsInToss();

function TestProbe() {
  const loc = testUseLocation();
  // eslint-disable-next-line no-console
  console.log("TEST-PROBE pathname=", loc.pathname);
  return null;
}

describe("dbg", () => {
  it("compare", () => {
    // eslint-disable-next-line no-console
    console.log("SAME useLocation identity?", rrdSrc.useLocation === testUseLocation);
    renderWithRouter(
      React.createElement(React.Fragment, null,
        React.createElement(TestProbe),
        React.createElement(DbgProbe)),
      { initialEntries: ["/budget"] });
  });
});
