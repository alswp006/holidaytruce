import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { useLocation } from "react-router-dom";

vi.mock("@toss/tds-mobile", () => ({}));

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe">{loc.pathname}</div>;
}

describe("dbg", () => {
  it("inline empty tds mock", () => {
    renderWithRouter(<Probe />, { initialEntries: ["/budget"] });
    expect(screen.getByTestId("probe")).toHaveTextContent("/budget");
  });
});
