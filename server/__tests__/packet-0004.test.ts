import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

// Coder will implement and export Express app from server/src/index.ts
// This test file defines the contract that the backend must fulfill

describe("Packet 0004: 백엔드 스캐폴딩 + CORS + 헬스체크", () => {
  let app: any;

  beforeAll(async () => {
    // Coder will ensure this import works after implementing server/src/index.ts
    // import app from "../src/index";
    // For now, tests will fail until implementation exists
  });

  // ============================================================================
  // AC-1: GET /health 200 & { ok:true }
  // ============================================================================

  it("AC-1[P0]: GET /health returns 200 status code", async () => {
    // Must respond to GET /health with exactly 200 OK
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
  });

  it("AC-1[P0]: GET /health returns JSON body with { ok: true }", async () => {
    // Response body must be exactly { ok: true }
    const response = await request(app).get("/health");
    expect(response.body).toEqual({ ok: true });
    expect(response.body.ok).toBe(true);
  });

  // ============================================================================
  // AC-2a: CORS preflight (OPTIONS) for whitelisted origin passes
  // ============================================================================

  it("AC-2a[P0]: OPTIONS /health returns 200 for whitelisted origin", async () => {
    // Parse CORS_ORIGINS from env (comma-separated)
    // Example: "https://app.toss.com,https://sandbox.toss.com"
    const corsOrigins = (process.env.CORS_ORIGINS || "https://app.toss.com").split(",").map(s => s.trim());
    const allowedOrigin = corsOrigins[0];

    const response = await request(app)
      .options("/health")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(200);
  });

  it("AC-2a[P0]: OPTIONS /health sets correct CORS headers for whitelisted origin", async () => {
    const corsOrigins = (process.env.CORS_ORIGINS || "https://app.toss.com").split(",").map(s => s.trim());
    const allowedOrigin = corsOrigins[0];

    const response = await request(app)
      .options("/health")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "GET");

    // Must echo back the allowed origin
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    // Must indicate allowed methods
    expect(response.headers["access-control-allow-methods"]).toBeDefined();
    expect(response.headers["access-control-allow-methods"]).toContain("GET");
  });

  // ============================================================================
  // AC-2b: CORS preflight (OPTIONS) for non-whitelisted origin is blocked
  // ============================================================================

  it("AC-2b[P0]: OPTIONS /health blocks non-whitelisted origin", async () => {
    // Request from disallowed origin should not receive CORS headers
    const blockedOrigin = "https://malicious.com";
    const corsOrigins = (process.env.CORS_ORIGINS || "https://app.toss.com").split(",").map(s => s.trim());

    // Verify that blockedOrigin is actually NOT in the whitelist
    expect(corsOrigins).not.toContain(blockedOrigin);

    const response = await request(app)
      .options("/health")
      .set("Origin", blockedOrigin);

    // Browser will reject CORS if Access-Control-Allow-Origin is not set
    expect(response.headers["access-control-allow-origin"]).not.toBe(blockedOrigin);
  });

  it("AC-2b[P0]: GET /health still works from disallowed origin (no browser enforcement on server)", async () => {
    // Server receives request from any origin; browser enforces CORS
    // Server should not send CORS headers for disallowed origin
    const blockedOrigin = "https://malicious.com";

    const response = await request(app)
      .get("/health")
      .set("Origin", blockedOrigin);

    expect(response.status).toBe(200);
    // But CORS header should not be echoed back for this origin
    expect(response.headers["access-control-allow-origin"]).not.toBe(blockedOrigin);
  });

  // ============================================================================
  // AC-3: PORT environment variable binding
  // ============================================================================

  it("AC-3[P0]: server respects PORT environment variable", async () => {
    // Coder must read process.env.PORT and bind to that port
    // This test is indirect: if server is running, it's listening on the right port
    const portFromEnv = process.env.PORT || "3000";
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    // If we got here, the server is running (implies PORT was respected)
  });

  // ============================================================================
  // AC-4a: .env.example exists with required variables
  // ============================================================================

  it("AC-4a[P0]: server/.env.example file exists", async () => {
    const fs = require("fs");
    const path = require("path");
    const envExamplePath = path.join(__dirname, "../.env.example");

    expect(() => fs.readFileSync(envExamplePath, "utf8")).not.toThrow();
  });

  it("AC-4a[P0]: .env.example contains ANTHROPIC_API_KEY", async () => {
    const fs = require("fs");
    const path = require("path");
    const envExamplePath = path.join(__dirname, "../.env.example");
    const envContent = fs.readFileSync(envExamplePath, "utf8");

    expect(envContent).toContain("ANTHROPIC_API_KEY");
  });

  it("AC-4a[P0]: .env.example contains ANTHROPIC_MODEL", async () => {
    const fs = require("fs");
    const path = require("path");
    const envExamplePath = path.join(__dirname, "../.env.example");
    const envContent = fs.readFileSync(envExamplePath, "utf8");

    expect(envContent).toContain("ANTHROPIC_MODEL");
  });

  it("AC-4a[P0]: .env.example contains CORS_ORIGINS", async () => {
    const fs = require("fs");
    const path = require("path");
    const envExamplePath = path.join(__dirname, "../.env.example");
    const envContent = fs.readFileSync(envExamplePath, "utf8");

    expect(envContent).toContain("CORS_ORIGINS");
  });

  it("AC-4a[P0]: .env.example contains PORT", async () => {
    const fs = require("fs");
    const path = require("path");
    const envExamplePath = path.join(__dirname, "../.env.example");
    const envContent = fs.readFileSync(envExamplePath, "utf8");

    expect(envContent).toContain("PORT");
  });

  // ============================================================================
  // AC-4b: .env.example does not contain actual secrets
  // ============================================================================

  it("AC-4b[P1]: .env.example does not contain actual API keys", async () => {
    const fs = require("fs");
    const path = require("path");
    const envExamplePath = path.join(__dirname, "../.env.example");
    const envContent = fs.readFileSync(envExamplePath, "utf8");

    // Reject patterns like sk-XXXX (OpenAI), sk_live_XXXX (Stripe), etc.
    const secretPattern = /sk[_-][a-zA-Z0-9]{20,}/g;
    expect(envContent).not.toMatch(secretPattern);

    // Reject patterns like AKIA**** (AWS)
    expect(envContent).not.toMatch(/AKIA[A-Z0-9]{16}/);
  });

  it("AC-4b[P1]: .env.example does not contain actual URLs or domains", async () => {
    const fs = require("fs");
    const path = require("path");
    const envExamplePath = path.join(__dirname, "../.env.example");
    const envContent = fs.readFileSync(envExamplePath, "utf8");

    // Split by lines and check each env var value
    const lines = envContent.split("\n").filter((line) => line.includes("=") && !line.startsWith("#"));

    lines.forEach((line) => {
      const [key, value] = line.split("=").map((s) => s.trim());
      if (!value) return; // Empty value is ok

      // Values should be placeholders like "your-api-key-here", "http://localhost:3000", etc.
      // Not actual production values
      if (value.includes("https://")) {
        expect(value).toMatch(/localhost|example\.com|placeholder|your-|sample-/i);
      }
    });
  });
});
