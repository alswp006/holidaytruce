import { RELATIONS, TONES, SEASONS, CAUSES } from "./types";
import type { Relation, ToneKey, Season, Cause } from "./types";

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// ============================================================================
// now() — single wrapper for current timestamp (epoch ms)
// ============================================================================

function now(): number {
  return Date.now();
}

// ============================================================================
// Core read/write with fallback & error handling
// ============================================================================

export function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeKey<T>(key: string, value: T): { ok: boolean } {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ============================================================================
// Envelope helpers: record wrapper with id/createdAt/updatedAt
// ============================================================================

export function withCreate<T extends Record<string, any>>(
  data: T
): T & { id: string; createdAt: number; updatedAt: number } {
  const timestamp = now();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function withUpdate<T extends Record<string, any>>(
  data: T & { id?: string; createdAt?: number; updatedAt?: number }
): T & { updatedAt: number } {
  return {
    ...data,
    updatedAt: now(),
  };
}

// ============================================================================
// Catalog validators — check enum membership
// ============================================================================

export function validateRelation(v: any): v is Relation {
  return typeof v === "string" && (RELATIONS as readonly string[]).includes(v);
}

export function validateTone(v: any): v is ToneKey {
  return typeof v === "string" && (TONES as readonly string[]).includes(v);
}

export function validateSeason(v: any): v is Season {
  return typeof v === "string" && (SEASONS as readonly string[]).includes(v);
}

export function validateCauses(v: any): v is Cause[] {
  if (!Array.isArray(v)) return false;
  return v.every((c) => typeof c === "string" && (CAUSES as readonly string[]).includes(c));
}
