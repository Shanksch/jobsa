import type {
  HealthResponse,
  UserProfile,
  Resume,
  ResumeListItem,
  Education,
  WorkExperience,
  Project,
  UserSkill,
  Certification,
  Achievement,
  Publication,
  Application,
  ApplicationListItem,
  ApplicationStats,
} from "@jobsa/shared";

import { supabase } from "./supabase.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export class BackendWakingUpError extends Error {
  constructor(attempt: number, maxAttempts: number) {
    super(`Backend is waking up… (attempt ${attempt}/${maxAttempts})`);
    this.name = 'BackendWakingUpError';
  }
}

function isRetriableError(error: unknown): boolean {
  // Network failure (backend is down / cold starting)
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  return false;
}

function isRetriableStatus(status: number): boolean {
  // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
  // These are returned by Render when the backend is still spinning up
  return status === 502 || status === 503 || status === 504;
}

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s, 16s

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);
      if (isRetriableStatus(response.status) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[JobSA] Backend returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[JobSA] Backend unreachable, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // All retries exhausted — throw a user-friendly error
      throw new BackendWakingUpError(attempt, MAX_RETRIES);
    }
  }
  throw new BackendWakingUpError(MAX_RETRIES, MAX_RETRIES);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  // Get current session token and attach it
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetchWithRetry(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      message = errData.detail || message;
    } catch {
      // Ignore
    }
    throw new Error(message);
  }

  return response.json();
}

export const fetchHealth = (): Promise<HealthResponse> =>
  request<HealthResponse>("/api/health");

async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export const api = {
  profile: {
    get: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
    create: async (profileData: Partial<UserProfile>) => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from("user_profiles").insert([{ id: userId, ...profileData }]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (profileData: Partial<UserProfile>) => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from("user_profiles").update(profileData).eq("id", userId).select().single();
      if (error) throw error;
      return data;
    },
    delete: async () => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from("user_profiles").delete().eq("id", userId);
      if (error) throw error;
    },
  },

  resumes: {
    list: () => request<ResumeListItem[]>("/api/resumes"),
    get: (id: string) => request<Resume>(`/api/resumes/${id}`),
    upload: (file: File, name: string, isPrimary = false) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("is_primary", String(isPrimary));
      return request<Resume>("/api/resumes", {
        method: "POST",
        body: formData,
      });
    },
    update: (id: string, data: { name?: string; is_primary?: boolean }) =>
      request<Resume>(`/api/resumes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/resumes/${id}`, {
        method: "DELETE",
      }),
    import: (id: string) =>
      request<{ detail: string }>(`/api/resumes/${id}/import`, {
        method: "POST",
      }),
    getDownloadUrl: (id: string) => `${BACKEND_URL}/api/resumes/${id}/download`,
  },

  knowledge: {
    education: createKnowledgeTableApi<Education>("education"),
    experience: createKnowledgeTableApi<WorkExperience>("work_experience"),
    projects: createKnowledgeTableApi<Project>("projects"),
    skills: {
      list: async () => {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from("user_skills")
          .select("*, skill:skills(*)")
          .eq("profile_id", userId);
        if (error) throw error;
        return data as UserSkill[];
      },
      create: async (payload: any) => {
        const userId = await getCurrentUserId();
        let skillId = payload.skill_id;
        
        // If skill object is provided, find or create the global skill
        if (!skillId && payload.skill?.name) {
          const { data: existing } = await supabase
            .from("skills")
            .select("id")
            .ilike("name", payload.skill.name)
            .maybeSingle();
            
          if (existing) {
            skillId = existing.id;
          } else {
            const { data: newSkill, error: skillError } = await supabase
              .from("skills")
              .insert([{ name: payload.skill.name, category: payload.skill.category }])
              .select()
              .single();
            if (skillError) throw skillError;
            skillId = newSkill.id;
          }
        }
        
        const { skill, ...userSkillData } = payload;
        
        const { data, error } = await supabase
          .from("user_skills")
          .insert([{ profile_id: userId, skill_id: skillId, ...userSkillData }])
          .select("*, skill:skills(*)")
          .single();
        if (error) throw error;
        return data as UserSkill;
      },
      update: async (id: string, payload: any) => {
        const { skill, ...userSkillData } = payload;
        const { data, error } = await supabase
          .from("user_skills")
          .update(userSkillData)
          .eq("id", id)
          .select("*, skill:skills(*)")
          .single();
        if (error) throw error;
        return data as UserSkill;
      },
      delete: async (id: string) => {
        const { error } = await supabase.from("user_skills").delete().eq("id", id);
        if (error) throw error;
      }
    },
    certifications: createKnowledgeTableApi<Certification>("certifications"),
    achievements: createKnowledgeTableApi<Achievement>("achievements"),
    publications: createKnowledgeTableApi<Publication>("publications"),
  },

  applications: {
    list: async (params?: { status?: string; search?: string; limit?: number }) => {
      const userId = await getCurrentUserId();
      let query = supabase.from("applications").select("*").eq("profile_id", userId).order("updated_at", { ascending: false });
      
      if (params?.status) {
        query = query.eq("status", params.status);
      }
      if (params?.search) {
        query = query.ilike("company_name", `%${params.search}%`);
      }
      if (params?.limit) {
        query = query.limit(params.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ApplicationListItem[];
    },
    get: async (id: string) => {
      const { data, error } = await supabase.from("applications").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Application;
    },
    create: async (appData: Partial<Application>) => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from("applications").insert([{ profile_id: userId, ...appData }]).select().single();
      if (error) throw error;
      return data as Application;
    },
    update: async (id: string, appData: Partial<Application>) => {
      const { data, error } = await supabase.from("applications").update({ ...appData, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data as Application;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    stats: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from("applications").select("status, created_at").eq("profile_id", userId);
      if (error) throw error;
      
      const by_status: Record<string, number> = {
        draft: 0,
        applied: 0,
        interview: 0,
        rejected: 0,
        offer: 0,
      };
      
      let this_week = 0;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const app of data) {
        const st = app.status as string;
        by_status[st] = (by_status[st] ?? 0) + 1;
        if (app.created_at && new Date(app.created_at) > oneWeekAgo) {
          this_week++;
        }
      }

      const total = data.length;
      const interviews = by_status["interview"] ?? 0;
      const interview_rate = total > 0 ? Math.round((interviews / total) * 1000) / 10 : 0;
      
      return {
        total,
        by_status,
        this_week,
        interview_rate,
      } as ApplicationStats;
    },
  },
};

function createKnowledgeTableApi<T>(tableName: string) {
  return {
    list: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from(tableName).select("*").eq("profile_id", userId);
      if (error) throw error;
      return data as T[];
    },
    create: async (payload: any) => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from(tableName).insert([{ profile_id: userId, ...payload }]).select().single();
      if (error) throw error;
      return data as T;
    },
    update: async (id: string, payload: any) => {
      const { data, error } = await supabase.from(tableName).update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data as T;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    }
  };
}
