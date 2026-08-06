import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { useNavigate, useLocation } from "react-router-dom";

mockTds();
mockAppsInToss();

function Probe() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div>
      <span data-testid="loc">{location.pathname}</span>
      <button onClick={() => navigate("/budget")}>go</button>
    </div>
  );
}

describe("debug", () => {
  it("nav works", () => {
    renderWithRouter(<Probe />, { initialEntries: ["/"] });
    expect(screen.getByTestId("loc").textContent).toBe("/");
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByTestId("loc").textContent).toBe("/budget");
  });
});
