/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── "@/" alias support for require() calls ──
// Vite resolves the "@/" alias for `import`, but some test files use CJS-style
// `require("@/lib/...")` inside test bodies. Node's native require has no
// knowledge of Vite aliases, so patch module resolution to map "@/" -> src/.
const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "src");
const ModuleWithInternals = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
};
const originalResolveFilename = ModuleWithInternals._resolveFilename;
ModuleWithInternals._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request.startsWith("@/")) {
    const mapped = path.join(srcRoot, request.slice(2));
    for (const candidate of [mapped, `${mapped}.ts`, `${mapped}.tsx`, path.join(mapped, "index.ts")]) {
      try {
        return originalResolveFilename.call(this, candidate, ...rest);
      } catch {
        // try next candidate
      }
    }
  }
  return originalResolveFilename.call(this, request, ...rest);
};

// ── Plain-object localStorage stub (mock-friendly) ──
// jsdom implements `localStorage` as a spec-compliant Proxy (Web Storage's
// "legacy platform object" semantics): assigning `localStorage.setItem = fn`
// is intercepted as "store a value under the key 'setItem'" instead of
// replacing the method, so per-instance method mocking (as tests do) silently
// no-ops and the real implementation keeps running. Swap in a plain
// forwarding object — ordinary property assignment on it behaves normally.
function makeStorageStub(real: Storage): Storage {
  const stub = {
    getItem: (key: string) => real.getItem(key),
    setItem: (key: string, value: string) => real.setItem(key, value),
    removeItem: (key: string) => real.removeItem(key),
    clear: () => real.clear(),
    key: (index: number) => real.key(index),
  };
  Object.defineProperty(stub, "length", { get: () => real.length, enumerable: true });
  return stub as unknown as Storage;
}
Object.defineProperty(globalThis, "localStorage", {
  value: makeStorageStub(globalThis.localStorage),
  writable: true,
  configurable: true,
});

// ── localStorage / sessionStorage isolation ──
// jsdom's storage persists between tests by default. Clear it to prevent pollution.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ── requestAnimationFrame shim for jsdom ──
// jsdom does NOT implement rAF natively, so animate/countup code hangs forever.
// Shim that immediately invokes callback with a monotonic timestamp.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let now = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    now += 16;
    return setTimeout(() => cb(now), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelAnimationFrame;
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
