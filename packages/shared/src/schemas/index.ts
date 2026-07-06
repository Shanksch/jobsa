import { z } from "zod";

/**
 * Zod schemas for runtime validation on the frontend.
 * These mirror the backend Pydantic schemas and will eventually
 * be auto-generated from the shared JSON Schema source of truth.
 */

// ─── Health ────────────────────────────────────────────────

export const serviceHealthSchema = z.object({
  status: z.enum(["up", "down"]),
  latency_ms: z.number().optional(),
});

export const healthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  version: z.string(),
  timestamp: z.string(),
  services: z.record(z.string(), serviceHealthSchema).optional(),
});

export type HealthResponseSchema = z.infer<typeof healthResponseSchema>;

// ─── API Error ─────────────────────────────────────────────

export const apiErrorSchema = z.object({
  detail: z.string(),
  code: z.string().optional(),
  request_id: z.string().optional(),
});

export type ApiErrorSchema = z.infer<typeof apiErrorSchema>;
