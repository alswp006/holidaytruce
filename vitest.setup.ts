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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// ── "@/" alias support for require() calls ──
// Vite resolves the "@/" alias for `import`, but some test files use CJS-style
// `require("@/lib/...")` inside test bodies. Node's native require has no
// knowledge of Vite aliases, so patch module resolution to map "@/" -> src/.
const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "src");
const ModuleWithInternals = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
  _extensions: Record<string, (mod: unknown, filename: string) => void>;
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
  try {
    return originalResolveFilename.call(this, request, ...rest);
  } catch (err) {
    // Relative extension-less requests (e.g. `require("../lib/utils")` from a component
    // reached via the "@/pages/..." require() chain) aren't resolved by Node's default
    // require.extensions map (only .js/.json/.node) — retry with .ts/.tsx appended.
    if (request.startsWith(".")) {
      for (const ext of [".ts", ".tsx"]) {
        try {
          return originalResolveFilename.call(this, request + ext, ...rest);
        } catch {
          // try next candidate
        }
      }
    }
    throw err;
  }
};

// ── Bridge vi.mock() into require()-loaded pages ──
// Some page tests dynamically `require("@/pages/...")` a page (TDD red-phase trick —
// see those test files for why). That page's own `import ... from "react-router-dom"` /
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" / "@/lib/storage" etc. get compiled to
// `require(...)` calls too (see the `.tsx`/`.ts` extension handlers below) — real Node
// `require()`, which resolves from disk and has NO knowledge of `vi.mock()` (that only
// intercepts Vite/vite-node's ESM module graph). Left unbridged, a required page always
// gets the REAL react-router-dom hooks / REAL @toss/tds-mobile (crashes: "ThemeProvider로
// 감싸야 합니다") / REAL (empty) storage — regardless of what the test mocked.
// Fix: before each test, `import()` the specifiers pages commonly depend on — that import
// goes through Vite's normal SSR module graph and DOES resolve to whatever the test's
// `vi.mock()` registered (or the real module, if unmocked) — then serve requests for those
// exact specifiers straight from this cache in the `Module._load` override below.
const REQUIRE_BRIDGE_SPECIFIERS = [
  "react-router-dom",
  "@toss/tds-mobile",
  "@apps-in-toss/web-framework",
  "@/lib/storage",
  "@/lib/scriptApi",
  "@/components/TossRewardAd",
];
let requireBridgeCache: Record<string, unknown> = {};
beforeEach(async () => {
  const cache: Record<string, unknown> = {};
  for (const specifier of REQUIRE_BRIDGE_SPECIFIERS) {
    try {
      cache[specifier] = await import(/* @vite-ignore */ specifier);
    } catch {
      // Not resolvable from this test file's context — real require() fallback handles it.
    }
  }
  requireBridgeCache = cache;
});
const ModuleWithLoad = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = ModuleWithLoad._load;
ModuleWithLoad._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(requireBridgeCache, request)) {
    return requireBridgeCache[request];
  }
  return originalLoad.call(this, request, parent, isMain);
};

// ── .tsx require() support (Node's native type-stripping doesn't cover .tsx) ──
// Some page tests use `require("@/pages/...")` (TDD red-phase trick — see those test
// files for why). Node's unflagged TypeScript support (v22.6+) only erases type
// annotations for `.ts`; it does not implement a JSX transform, so it never handles
// `.tsx` — requiring any `.tsx` file (even one with zero JSX, just TS type annotations
// like `function f(x: string)`) throws "SyntaxError: Unexpected token" because the type
// annotation is left in place and parsed as plain JS. Compile `.tsx` ourselves via the
// esbuild CLI binary (already a Vite dependency) into plain CJS before Node ever sees
// it. NOTE: must shell out to the binary rather than use esbuild's JS API (`transformSync`)
// — that API self-checks `new TextEncoder().encode("") instanceof Uint8Array` at import
// time, which is false in the jsdom test environment (jsdom's realm has its own
// Uint8Array), so importing "esbuild" here throws "Invariant violation".
const esbuildBin = path.join(srcRoot, "..", "node_modules", ".bin", "esbuild");
ModuleWithInternals._extensions[".tsx"] = function (mod, filename) {
  const source = readFileSync(filename, "utf8");
  const code = execFileSync(
    esbuildBin,
    ["--loader=tsx", "--format=cjs", "--target=es2020", "--jsx=automatic", `--sourcefile=${filename}`],
    { input: source, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  (mod as { _compile: (code: string, filename: string) => void })._compile(code, filename);
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
