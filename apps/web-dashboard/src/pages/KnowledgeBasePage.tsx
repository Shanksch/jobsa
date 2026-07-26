import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  GraduationCap,
  Briefcase,
  FolderCode,
  Wrench,
  Award,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Input,
  Textarea,
  Select,
  Skeleton,
} from "@jobsa/ui";
import {
  educationSchema,
  workExperienceSchema,
  projectSchema,
  userSkillSchema,
  certificationSchema,
} from "@jobsa/shared/schemas";
import { api } from "../lib/api.js";

export function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("education");
  const [showAddForm, setShowAddForm] = React.useState(false);

  // Queries for each type
  const { data: education, isLoading: edLoading } = useQuery({
    queryKey: ["education"],
    queryFn: api.knowledge.education.list,
  });

  const { data: experience, isLoading: exLoading } = useQuery({
    queryKey: ["experience"],
    queryFn: api.knowledge.experience.list,
  });

  const { data: projects, isLoading: prLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.knowledge.projects.list,
  });

  const { data: skills, isLoading: skLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: api.knowledge.skills.list,
  });

  const { data: certifications, isLoading: certLoading } = useQuery({
    queryKey: ["certifications"],
    queryFn: api.knowledge.certifications.list,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: ({ type, data }: { type: string; data: any }) => {
      const endpoints: Record<string, (d: any) => Promise<any>> = {
        education: api.knowledge.education.create,
        experience: api.knowledge.experience.create,
        projects: api.knowledge.projects.create,
        skills: api.knowledge.skills.create,
        certifications: api.knowledge.certifications.create,
      };
      return (endpoints as any)[type](data);
    },
    onSuccess: () => {
      toast.success("Entry added successfully.");
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      setShowAddForm(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add entry.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => {
      const endpoints: Record<string, (id: string) => Promise<any>> = {
        education: api.knowledge.education.delete,
        experience: api.knowledge.experience.delete,
        projects: api.knowledge.projects.delete,
        skills: api.knowledge.skills.delete,
        certifications: api.knowledge.certifications.delete,
      };
      return (endpoints as any)[type](id);
    },
    onSuccess: () => {
      toast.success("Entry deleted.");
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete entry.");
    },
  });

  // Forms setup
  const resolvers: Record<string, any> = {
    education: zodResolver(educationSchema),
    experience: zodResolver(workExperienceSchema),
    projects: zodResolver(projectSchema),
    skills: zodResolver(userSkillSchema),
    certifications: zodResolver(certificationSchema),
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: resolvers[activeTab],
  });

  React.useEffect(() => {
    reset();
    setShowAddForm(false);
  }, [activeTab, reset]);

  const onSubmit = (data: any) => {
    // Process list strings if necessary
    if (activeTab === "experience" || activeTab === "projects") {
      if (typeof data.highlights === "string") {
        data.highlights = data.highlights.split("\n").filter(Boolean);
      }
      if (typeof data.technologies === "string") {
        data.technologies = data.technologies.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    addMutation.mutate({ type: activeTab, data });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      deleteMutation.mutate({ type: activeTab, id });
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Career Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Build your detailed records. These will be retrieved for personalized RAG response generation.
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 self-start">
            <Plus className="size-4" /> Add Record
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="education" className="flex items-center gap-1.5">
            <GraduationCap className="size-4" /> Education
          </TabsTrigger>
          <TabsTrigger value="experience" className="flex items-center gap-1.5">
            <Briefcase className="size-4" /> Work History
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-1.5">
            <FolderCode className="size-4" /> Projects
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-1.5">
            <Wrench className="size-4" /> Skills
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-1.5">
            <Award className="size-4" /> Certifications
          </TabsTrigger>
        </TabsList>

        {/* Dynamic add form */}
        {showAddForm && (
          <Card className="mb-6 border border-primary/20 bg-primary/[0.01]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">New {activeTab} record</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {activeTab === "education" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Institution/School" error={errors.institution?.message} {...register("institution")} />
                      <Input label="Degree (e.g. B.S., M.S.)" error={errors.degree?.message} {...register("degree")} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Input label="Field of Study" error={errors.field_of_study?.message} {...register("field_of_study")} />
                      <Input label="GPA" type="number" step="0.01" error={errors.gpa?.message} {...register("gpa", { valueAsNumber: true })} />
                      <div className="flex items-center gap-2 mt-7">
                        <input type="checkbox" id="ed-current" {...register("is_current")} className="size-4 rounded" />
                        <label htmlFor="ed-current" className="text-sm font-medium">Currently Studying</label>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Start Date" type="date" error={errors.start_date?.message} {...register("start_date")} />
                      <Input label="End Date" type="date" error={errors.end_date?.message} {...register("end_date")} />
                    </div>
                    <Textarea label="Description / Achievements" rows={3} error={errors.description?.message} {...register("description")} />
                  </div>
                )}

                {activeTab === "experience" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Company Name" error={errors.company?.message} {...register("company")} />
                      <Input label="Job Title" error={errors.title?.message} {...register("title")} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Input label="Location" placeholder="e.g. Remote / NYC" error={errors.location?.message} {...register("location")} />
                      <Input label="Start Date" type="date" error={errors.start_date?.message} {...register("start_date")} />
                      <Input label="End Date" type="date" error={errors.end_date?.message} {...register("end_date")} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="ex-current" {...register("is_current")} className="size-4 rounded" />
                      <label htmlFor="ex-current" className="text-sm font-medium">Currently Working Here</label>
                    </div>
                    <Textarea label="Job Description" rows={4} error={errors.description?.message} {...register("description")} />
                    <Textarea label="Key Highlights (one per line)" placeholder="Led development of AI pipeline&#10;Mentored 3 junior developers" rows={3} {...register("highlights")} />
                    <Input label="Technologies Used (comma separated)" placeholder="React, Python, AWS" {...register("technologies")} />
                  </div>
                )}

                {activeTab === "projects" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Project Name" error={errors.name?.message} {...register("name")} />
                      <Input label="Project URL" placeholder="https://github.com/..." error={errors.url?.message} {...register("url")} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Start Date" type="date" error={errors.start_date?.message} {...register("start_date")} />
                      <Input label="End Date" type="date" error={errors.end_date?.message} {...register("end_date")} />
                    </div>
                    <Textarea label="Project Description" rows={3} error={errors.description?.message} {...register("description")} />
                    <Textarea label="Key Highlights (one per line)" placeholder="Reduced API latency by 40%&#10;Deployed using Docker" rows={3} {...register("highlights")} />
                    <Input label="Technologies Used (comma separated)" placeholder="TypeScript, Fastify, Postgres" {...register("technologies")} />
                  </div>
                )}

                {activeTab === "skills" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Skill Name" error={(errors as any).skill?.name?.message} {...register("skill.name")} />
                      <Select
                        label="Category"
                        options={[
                          { label: "Programming Languages", value: "Languages" },
                          { label: "Libraries & Frameworks", value: "Frameworks" },
                          { label: "Databases", value: "Databases" },
                          { label: "Tools & Infrastructure", value: "Tools" },
                          { label: "Soft Skills / Other", value: "Other" },
                        ]}
                        {...register("skill.category")}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Select
                        label="Proficiency Level"
                        options={[
                          { label: "Beginner", value: "beginner" },
                          { label: "Intermediate", value: "intermediate" },
                          { label: "Advanced", value: "advanced" },
                          { label: "Expert / Master", value: "expert" },
                        ]}
                        {...register("proficiency")}
                      />
                      <Input label="Years of Experience" type="number" step="0.5" error={errors.years_experience?.message} {...register("years_experience", { valueAsNumber: true })} />
                    </div>
                  </div>
                )}

                {activeTab === "certifications" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Certification Name" error={errors.name?.message} {...register("name")} />
                      <Input label="Issuer" error={errors.issuer?.message} {...register("issuer")} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Issue Date" type="date" error={errors.issue_date?.message} {...register("issue_date")} />
                      <Input label="Expiry Date" type="date" error={errors.expiry_date?.message} {...register("expiry_date")} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Credential ID" error={errors.credential_id?.message} {...register("credential_id")} />
                      <Input label="Credential URL" error={errors.credential_url?.message} {...register("credential_url")} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Adding..." : "Save Record"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Education Content */}
        <TabsContent value="education">
          {edLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-12 w-full mt-2" />
                </Card>
              ))}
            </div>
          ) : !education || education.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center italic">No education records found.</p>
          ) : (
            <div className="space-y-4">
              {education.map((ed, i) => (
                <Card key={ed.id} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{ed.degree} in {ed.field_of_study || "N/A"}</CardTitle>
                      <CardDescription className="text-xs">{ed.institution}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ed.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-muted-foreground font-medium">
                      Timeline: {ed.start_date || "N/A"} to {ed.is_current ? "Present" : ed.end_date || "N/A"}
                    </p>
                    {ed.gpa && <p className="text-muted-foreground">GPA: {ed.gpa}</p>}
                    {ed.description && <p className="text-foreground/80 leading-relaxed pt-1">{ed.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Experience Content */}
        <TabsContent value="experience">
          {exLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-16 w-full mt-2" />
                </Card>
              ))}
            </div>
          ) : !experience || experience.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center italic">No experience records found.</p>
          ) : (
            <div className="space-y-4">
              {experience.map((ex, i) => (
                <Card key={ex.id} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{ex.title}</CardTitle>
                      <CardDescription className="text-xs">{ex.company} — {ex.location || "N/A"}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ex.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="text-xs space-y-3">
                    <p className="text-muted-foreground font-medium">
                      Timeline: {ex.start_date || "N/A"} to {ex.is_current ? "Present" : ex.end_date || "N/A"}
                    </p>
                    {ex.description && <p className="text-foreground/80 leading-relaxed">{ex.description}</p>}
                    {ex.highlights && ex.highlights.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <p className="font-semibold text-foreground">Highlights:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {ex.highlights.map((h, i) => (
                            <li key={i} className="text-foreground/80">{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ex.technologies && ex.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ex.technologies.map((t, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Content */}
        <TabsContent value="projects">
          {prLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-12 w-full mt-2" />
                </Card>
              ))}
            </div>
          ) : !projects || projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center italic">No project records found.</p>
          ) : (
            <div className="space-y-4">
              {projects.map((pr, i) => (
                <Card key={pr.id} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{pr.name}</CardTitle>
                      {pr.url && (
                        <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          {pr.url}
                        </a>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pr.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    {pr.description && <p className="text-foreground/80 leading-relaxed">{pr.description}</p>}
                    {pr.highlights && pr.highlights.length > 0 && (
                      <ul className="list-disc pl-4 space-y-0.5">
                        {pr.highlights.map((h, i) => (
                          <li key={i} className="text-foreground/80">{h}</li>
                        ))}
                      </ul>
                    )}
                    {pr.technologies && pr.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {pr.technologies.map((t, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Skills Content */}
        <TabsContent value="skills">
          {skLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col gap-2 border border-border bg-card p-3 rounded-lg">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : !skills || skills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center italic">No skill records found.</p>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {skills.map((sk, i) => (
                    <div key={sk.id} className="flex items-center justify-between border border-border bg-card p-3 rounded-lg animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{sk.skill?.name || "Unknown Skill"}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                          {sk.skill?.category || "General"} • {sk.proficiency || "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sk.years_experience && (
                          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {sk.years_experience} Yrs
                          </span>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sk.id)} className="text-destructive hover:bg-destructive/10 size-7">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Certifications Content */}
        <TabsContent value="certifications">
          {certLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-8 w-1/2 mt-2" />
                </Card>
              ))}
            </div>
          ) : !certifications || certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center italic">No certifications found.</p>
          ) : (
            <div className="space-y-4">
              {certifications.map((cert, i) => (
                <Card key={cert.id} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{cert.name}</CardTitle>
                      <CardDescription className="text-xs">Issuer: {cert.issuer || "N/A"}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cert.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <p className="text-muted-foreground">
                      Issue Date: {cert.issue_date || "N/A"} • Expires: {cert.expiry_date || "Never"}
                    </p>
                    {cert.credential_id && <p className="text-muted-foreground">Credential ID: {cert.credential_id}</p>}
                    {cert.credential_url && (
                      <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-medium inline-block mt-1">
                        View Credential
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
