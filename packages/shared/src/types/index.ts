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

// ─── Profile Types ─────────────────────────────────────────

export interface LanguageEntry {
  language: string;
  proficiency: string;
}

export interface UserProfile extends BaseEntity {
  email: string;
  full_name: string;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  summary?: string | null;
  salary_expectation?: string | null;
  notice_period?: string | null;
  work_authorization?: string | null;
  preferred_locations: string[];
  languages: LanguageEntry[];
}

// ─── Resume Types ─────────────────────────────────────────

export interface ResumeListItem {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  created_at: string;
}

export interface Resume extends BaseEntity {
  profile_id: string;
  name: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  parsed_text?: string | null;
  parsed_markdown?: string | null;
  parsed_sections?: Record<string, any> | null;
  is_primary: boolean;
}

// ─── Knowledge Base Types ─────────────────────────────────

export interface Education extends BaseEntity {
  profile_id: string;
  institution: string;
  degree: string;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  gpa?: number | null;
  description?: string | null;
  is_current: boolean;
}

export interface WorkExperience extends BaseEntity {
  profile_id: string;
  company: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  highlights: string[];
  technologies: string[];
  is_current: boolean;
}

export interface Project extends BaseEntity {
  profile_id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  technologies: string[];
  highlights: string[];
  start_date?: string | null;
  end_date?: string | null;
}

export interface Skill extends BaseEntity {
  name: string;
  category?: string | null;
}

export interface UserSkill extends BaseEntity {
  profile_id: string;
  skill_id: string;
  skill?: Skill;
  proficiency?: string | null; // beginner, intermediate, advanced, expert
  years_experience?: number | null;
}

export interface Certification extends BaseEntity {
  profile_id: string;
  name: string;
  issuer?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
}

export interface Achievement extends BaseEntity {
  profile_id: string;
  title: string;
  description?: string | null;
  date?: string | null;
  url?: string | null;
}

export interface Publication extends BaseEntity {
  profile_id: string;
  title: string;
  publisher?: string | null;
  date?: string | null;
  url?: string | null;
  description?: string | null;
}

// ─── Field Classification ──────────────────────────────────

export interface ClassifiedField {
  field_id: string;
  label: string;
  canonical_field: string | null;
  confidence: number;
  source: "profile_match" | "llm_generated" | "user_override";
  suggested_value: string | null;
}

// ─── Application Types ─────────────────────────────────────

export type ApplicationStatus =
  | "draft"
  | "applied"
  | "interview"
  | "rejected"
  | "offer";

export interface Application extends BaseEntity {
  profile_id: string;
  resume_id?: string | null;
  company: string;
  role: string;
  posting_url?: string | null;
  ats_platform?: string | null;
  status: ApplicationStatus;
  match_score?: number | null;
  generated_answers?: Record<string, string> | null;
  applied_at?: string | null;
  notes?: string | null;
}

export interface ApplicationListItem {
  id: string;
  company: string;
  role: string;
  ats_platform?: string | null;
  status: ApplicationStatus;
  match_score?: number | null;
  applied_at?: string | null;
  created_at: string;
}

export interface ApplicationStats {
  total: number;
  by_status: Record<string, number>;
  this_week: number;
  interview_rate: number;
}
