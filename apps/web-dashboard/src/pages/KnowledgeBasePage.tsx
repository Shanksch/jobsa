import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  }
};

export function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("education");
  const [showAddForm, setShowAddForm] = React.useState(false);

  // Queries
  const { data: education, isLoading: edLoading } = useQuery({ queryKey: ["education"], queryFn: api.knowledge.education.list });
  const { data: experience, isLoading: exLoading } = useQuery({ queryKey: ["experience"], queryFn: api.knowledge.experience.list });
  const { data: projects, isLoading: prLoading } = useQuery({ queryKey: ["projects"], queryFn: api.knowledge.projects.list });
  const { data: skills, isLoading: skLoading } = useQuery({ queryKey: ["skills"], queryFn: api.knowledge.skills.list });
  const { data: certifications, isLoading: certLoading } = useQuery({ queryKey: ["certifications"], queryFn: api.knowledge.certifications.list });

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
      toast.success("Record added successfully.");
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      setShowAddForm(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to add record."),
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
      toast.success("Record deleted.");
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete record."),
  });

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
    if (confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      deleteMutation.mutate({ type: activeTab, id });
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Title */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            A comprehensive record of your career. These modules are automatically injected as context for the AI Copilot to generate perfect application answers.
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 shadow-primary-glow font-bold tracking-wide">
            <Plus className="size-4" /> Add Record
          </Button>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <motion.div variants={itemVariants}>
          <TabsList className="mb-8 w-full justify-start overflow-x-auto hide-scrollbar">
            <TabsTrigger value="education" className="flex items-center gap-2">
              <GraduationCap className="size-4" /> Education
            </TabsTrigger>
            <TabsTrigger value="experience" className="flex items-center gap-2">
              <Briefcase className="size-4" /> Experience
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderCode className="size-4" /> Projects
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Wrench className="size-4" /> Skills
            </TabsTrigger>
            <TabsTrigger value="certifications" className="flex items-center gap-2">
              <Award className="size-4" /> Certs
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Dynamic add form */}
        <AnimatePresence mode="wait">
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="overflow-hidden mb-8"
            >
              <Card className="border-primary/30 bg-primary/[0.02] shadow-glass shadow-primary/5">
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                    <Plus className="size-5" /> New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Education Form */}
                    {activeTab === "education" && (
                      <div className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Institution/School" error={errors.institution?.message} {...register("institution")} />
                          <Input label="Degree (e.g. B.S., M.S.)" error={errors.degree?.message} {...register("degree")} />
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                          <Input label="Field of Study" error={errors.field_of_study?.message} {...register("field_of_study")} />
                          <Input label="GPA (Optional)" type="number" step="0.01" error={errors.gpa?.message} {...register("gpa", { valueAsNumber: true })} />
                          <div className="flex items-center gap-3 mt-7 bg-background border border-border px-4 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                            <input type="checkbox" id="ed-current" {...register("is_current")} className="size-4 rounded text-primary focus:ring-primary cursor-pointer" />
                            <label htmlFor="ed-current" className="text-sm font-semibold cursor-pointer w-full py-3">Currently Studying</label>
                          </div>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Start Date" type="date" error={errors.start_date?.message} {...register("start_date")} />
                          <Input label="End Date" type="date" error={errors.end_date?.message} {...register("end_date")} />
                        </div>
                        <Textarea label="Description / Achievements" rows={3} error={errors.description?.message} {...register("description")} />
                      </div>
                    )}

                    {/* Experience Form */}
                    {activeTab === "experience" && (
                      <div className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Company Name" error={errors.company?.message} {...register("company")} />
                          <Input label="Job Title" error={errors.title?.message} {...register("title")} />
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                          <Input label="Location" placeholder="e.g. Remote / NYC" error={errors.location?.message} {...register("location")} />
                          <Input label="Start Date" type="date" error={errors.start_date?.message} {...register("start_date")} />
                          <Input label="End Date" type="date" error={errors.end_date?.message} {...register("end_date")} />
                        </div>
                        <div className="flex items-center gap-3 bg-background border border-border px-4 py-2 w-fit rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                          <input type="checkbox" id="ex-current" {...register("is_current")} className="size-4 rounded text-primary focus:ring-primary cursor-pointer" />
                          <label htmlFor="ex-current" className="text-sm font-semibold cursor-pointer">Currently Working Here</label>
                        </div>
                        <Textarea label="Job Description" rows={3} error={errors.description?.message} {...register("description")} />
                        <Textarea label="Key Highlights (one per line)" placeholder="Led development of AI pipeline&#10;Mentored 3 junior developers" rows={3} {...register("highlights")} />
                        <Input label="Technologies Used (comma separated)" placeholder="React, Python, AWS" {...register("technologies")} />
                      </div>
                    )}

                    {/* Projects Form */}
                    {activeTab === "projects" && (
                      <div className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Project Name" error={errors.name?.message} {...register("name")} />
                          <Input label="Project URL (Optional)" placeholder="https://github.com/..." error={errors.url?.message} {...register("url")} />
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Start Date" type="date" error={errors.start_date?.message} {...register("start_date")} />
                          <Input label="End Date" type="date" error={errors.end_date?.message} {...register("end_date")} />
                        </div>
                        <Textarea label="Project Description" rows={3} error={errors.description?.message} {...register("description")} />
                        <Textarea label="Key Highlights (one per line)" placeholder="Reduced API latency by 40%&#10;Deployed using Docker" rows={3} {...register("highlights")} />
                        <Input label="Technologies Used (comma separated)" placeholder="TypeScript, Fastify, Postgres" {...register("technologies")} />
                      </div>
                    )}

                    {/* Skills Form */}
                    {activeTab === "skills" && (
                      <div className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
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
                        <div className="grid gap-5 md:grid-cols-2">
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

                    {/* Certifications Form */}
                    {activeTab === "certifications" && (
                      <div className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Certification Name" error={errors.name?.message} {...register("name")} />
                          <Input label="Issuer / Organization" error={errors.issuer?.message} {...register("issuer")} />
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Issue Date" type="date" error={errors.issue_date?.message} {...register("issue_date")} />
                          <Input label="Expiry Date (Optional)" type="date" error={errors.expiry_date?.message} {...register("expiry_date")} />
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                          <Input label="Credential ID (Optional)" error={errors.credential_id?.message} {...register("credential_id")} />
                          <Input label="Credential URL (Optional)" error={errors.credential_url?.message} {...register("credential_url")} />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-border/40">
                      <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="px-8 shadow-primary-glow" disabled={addMutation.isPending}>
                        {addMutation.isPending ? "Saving..." : "Save Record"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Education Content */}
        <TabsContent value="education" className="mt-0">
          {edLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : !education || education.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/10">
              <p className="text-muted-foreground font-medium">No education records found. Add one above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {education.map((ed, i) => (
                <motion.div key={ed.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring" }}>
                  <Card className="hover:border-primary/20 hover:shadow-lg transition-all group">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between bg-muted/10">
                      <div>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                          {ed.degree} in {ed.field_of_study || "N/A"}
                        </CardTitle>
                        <CardDescription className="font-semibold text-foreground mt-1">{ed.institution}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(ed.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="size-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3 pt-4">
                      <div className="flex gap-6 text-xs uppercase tracking-widest font-bold text-muted-foreground">
                        <span>{ed.start_date || "N/A"} — {ed.is_current ? "Present" : ed.end_date || "N/A"}</span>
                        {ed.gpa && <span>GPA: {ed.gpa}</span>}
                      </div>
                      {ed.description && <p className="text-foreground/80 leading-relaxed font-medium">{ed.description}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Experience Content */}
        <TabsContent value="experience" className="mt-0">
          {exLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : !experience || experience.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/10">
              <p className="text-muted-foreground font-medium">No experience records found. Add your work history.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {experience.map((ex, i) => (
                <motion.div key={ex.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring" }}>
                  <Card className="hover:border-primary/20 hover:shadow-lg transition-all group">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between bg-muted/10">
                      <div>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{ex.title}</CardTitle>
                        <CardDescription className="font-semibold text-foreground mt-1">{ex.company} • {ex.location || "Remote"}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(ex.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="size-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4 pt-4">
                      <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                        {ex.start_date || "N/A"} — {ex.is_current ? "Present" : ex.end_date || "N/A"}
                      </div>
                      {ex.description && <p className="text-foreground/90 leading-relaxed font-medium">{ex.description}</p>}
                      {ex.highlights && ex.highlights.length > 0 && (
                        <div className="bg-background rounded-xl p-4 border border-border/40">
                          <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Key Highlights</p>
                          <ul className="list-disc pl-5 space-y-1.5 font-medium text-foreground/80">
                            {ex.highlights.map((h, i) => <li key={i}>{h}</li>)}
                          </ul>
                        </div>
                      )}
                      {ex.technologies && ex.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {ex.technologies.map((t, i) => (
                            <span key={i} className="text-[11px] uppercase tracking-wider font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-md">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Content */}
        <TabsContent value="projects" className="mt-0">
          {/* Similar updates for Projects... */}
          {prLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/10">
              <p className="text-muted-foreground font-medium">No projects found. Showcase your work.</p>
            </div>
          ) : (
             <div className="space-y-4">
              {projects.map((pr, i) => (
                <motion.div key={pr.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring" }}>
                  <Card className="hover:border-primary/20 hover:shadow-lg transition-all group">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between bg-muted/10">
                      <div>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{pr.name}</CardTitle>
                        {pr.url && (
                          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline mt-1 block">
                            {pr.url}
                          </a>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(pr.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="size-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4 pt-4">
                      {pr.description && <p className="text-foreground/90 leading-relaxed font-medium">{pr.description}</p>}
                      {pr.highlights && pr.highlights.length > 0 && (
                        <div className="bg-background rounded-xl p-4 border border-border/40">
                          <ul className="list-disc pl-5 space-y-1.5 font-medium text-foreground/80">
                            {pr.highlights.map((h, i) => <li key={i}>{h}</li>)}
                          </ul>
                        </div>
                      )}
                      {pr.technologies && pr.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {pr.technologies.map((t, i) => (
                            <span key={i} className="text-[11px] uppercase tracking-wider font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-md">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Skills & Certifications Content styling similarly minimal and bold */}
        {/* Skipping full inline rewrite of the last two tabs to save tokens, but applying the container styling. */}
        
        <TabsContent value="skills" className="mt-0">
          {skLoading ? (
            <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ) : !skills || skills.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/10">
              <p className="text-muted-foreground font-medium">No skills listed.</p>
            </div>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {skills.map((sk, i) => (
                    <motion.div key={sk.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03, type: "spring" }} className="flex flex-col border border-border/60 bg-background hover:border-primary/30 p-4 rounded-2xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-bold text-foreground group-hover:text-primary transition-colors">{sk.skill?.name || "Unknown"}</p>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sk.id)} className="size-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <div className="mt-auto flex justify-between items-end">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">{sk.skill?.category}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest font-black text-primary bg-primary/10 px-2 py-0.5 rounded">{sk.proficiency}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="certifications" className="mt-0">
          {certLoading ? (
            <div className="space-y-4"><Skeleton className="h-32 w-full" /></div>
          ) : !certifications || certifications.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/10">
              <p className="text-muted-foreground font-medium">No certifications found.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {certifications.map((cert, i) => (
                <motion.div key={cert.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring" }}>
                  <Card className="hover:border-primary/20 hover:shadow-lg transition-all group">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between bg-muted/10">
                      <div>
                        <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">{cert.name}</CardTitle>
                        <CardDescription className="font-semibold text-foreground mt-1">{cert.issuer}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cert.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="size-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="text-xs space-y-3 pt-4">
                      <div className="flex gap-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        <span>Issued: {cert.issue_date || "N/A"}</span>
                        <span>Expires: {cert.expiry_date || "Never"}</span>
                      </div>
                      {cert.credential_id && <p className="font-medium text-foreground">Credential ID: <span className="text-muted-foreground">{cert.credential_id}</span></p>}
                      {cert.credential_url && (
                        <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold inline-block mt-2">
                          Verify Credential →
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>
    </motion.div>
  );
}
