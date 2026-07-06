/**
 * Shared TypeScript types for the JobSA platform.
 * These mirror the backend Pydantic schemas and provide
 * type safety across frontend apps.
 */

// ─── API Response Types ────────────────────────────────────

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  services?: Record<string, ServiceHealth>;
}

export interface ServiceHealth {
  status: "up" | "down";
  latency_ms?: number;
}

export interface ApiError {
  detail: string;
  code?: string;
  request_id?: string;
}

// ─── Base Entity ───────────────────────────────────────────

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// ─── Profile Types (Phase 1+) ──────────────────────────────

export interface UserProfile extends BaseEntity {
  email: string;
  full_name: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  summary?: string;
}

// ─── Field Classification (Phase 3+) ──────────────────────

export interface ClassifiedField {
  field_id: string;
  label: string;
  canonical_field: string | null;
  confidence: number;
  source: "profile_match" | "llm_generated" | "user_override";
  suggested_value: string | null;
}

// ─── Application Types (Phase 4+) ─────────────────────────

export type ApplicationStatus =
  | "draft"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "rejected"
  | "interview"
  | "offer";

export interface Application extends BaseEntity {
  job_title: string;
  company: string;
  ats_platform: string;
  posting_url: string;
  status: ApplicationStatus;
  match_score?: number;
}
