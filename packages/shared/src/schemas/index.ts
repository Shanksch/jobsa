import { z } from "zod";

/**
 * Zod schemas for runtime validation on the frontend.
 * These mirror the backend Pydantic schemas and are used
 * for form validation.
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

// ─── Profile ───────────────────────────────────────────────

export const languageEntrySchema = z.object({
  language: z.string().min(1, "Language is required"),
  proficiency: z.string().default("Professional"),
});

export const profileSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Full name is required").max(200),
  phone: z.string().max(30).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  linkedin_url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
  github_url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
  portfolio_url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
  summary: z.string().nullable().optional(),
  salary_expectation: z.string().max(100).nullable().optional(),
  notice_period: z.string().max(50).nullable().optional(),
  work_authorization: z.string().max(100).nullable().optional(),
  preferred_locations: z.array(z.string()).default([]),
  languages: z.array(languageEntrySchema).default([]),
});

// ─── Resume ────────────────────────────────────────────────

export const resumeUpdateSchema = z.object({
  name: z.string().min(1, "Resume name is required").max(200).optional(),
  is_primary: z.boolean().optional(),
});

// ─── Knowledge Base ────────────────────────────────────────

export const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required").max(300),
  degree: z.string().min(1, "Degree is required").max(200),
  field_of_study: z.string().max(200).nullable().optional(),
  start_date: z.string().nullable().optional(), // YYYY-MM-DD
  end_date: z.string().nullable().optional(), // YYYY-MM-DD
  gpa: z.number().min(0).max(5).nullable().optional(),
  description: z.string().nullable().optional(),
  is_current: z.boolean().default(false),
});

export const workExperienceSchema = z.object({
  company: z.string().min(1, "Company name is required").max(200),
  title: z.string().min(1, "Job title is required").max(200),
  location: z.string().max(200).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  highlights: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  is_current: z.boolean().default(false),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().nullable().optional(),
  url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
  technologies: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required").max(100),
  category: z.string().max(50).nullable().optional(),
});

export const userSkillSchema = z.object({
  skill_id: z.string().uuid("Invalid skill ID").optional(), // Can be optional during creation if user types name
  proficiency: z.string().max(20).nullable().optional(),
  years_experience: z.number().min(0).nullable().optional(),
  skill: skillSchema.optional(),
});

export const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required").max(200),
  issuer: z.string().max(200).nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  credential_id: z.string().max(100).nullable().optional(),
  credential_url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
});

export const achievementSchema = z.object({
  title: z.string().min(1, "Achievement title is required").max(200),
  description: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
});

export const publicationSchema = z.object({
  title: z.string().min(1, "Publication title is required").max(300),
  publisher: z.string().max(200).nullable().optional(),
  date: z.string().nullable().optional(),
  url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
  description: z.string().nullable().optional(),
});

// ─── Applications ──────────────────────────────────────────

export const applicationSchema = z.object({
  company: z.string().min(1, "Company is required").max(200),
  role: z.string().min(1, "Job title/role is required").max(200),
  posting_url: z.string().url("Invalid URL").or(z.literal("")).nullable().optional(),
  ats_platform: z.string().max(50).nullable().optional(),
  status: z.enum(["draft", "applied", "interview", "rejected", "offer"]).default("draft"),
  resume_id: z.string().nullable().optional(),
  match_score: z.number().min(0).max(1).nullable().optional(),
  generated_answers: z.record(z.string()).nullable().optional(),
  applied_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
