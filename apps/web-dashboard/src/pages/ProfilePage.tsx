import { useForm, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Input,
  Textarea,
  Button,
  Skeleton
} from "@jobsa/ui";
import { profileSchema } from "@jobsa/shared/schemas";
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

export function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: api.profile.get,
  });

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: "",
      full_name: "",
      phone: "",
      location: "",
      linkedin_url: "",
      github_url: "",
      portfolio_url: "",
      summary: "",
      salary_expectation: "",
      notice_period: "",
      work_authorization: "",
      preferred_locations: [],
      languages: [],
    },
    values: profile ? {
      email: profile.email || "",
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      location: profile.location || "",
      linkedin_url: profile.linkedin_url || "",
      github_url: profile.github_url || "",
      portfolio_url: profile.portfolio_url || "",
      summary: profile.summary || "",
      salary_expectation: profile.salary_expectation || "",
      notice_period: profile.notice_period || "",
      work_authorization: profile.work_authorization || "",
      preferred_locations: profile.preferred_locations || [],
      languages: profile.languages || [],
    } : undefined,
  });

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control,
    name: "languages",
  });

  const mutation = useMutation({
    mutationFn: api.profile.update,
    onSuccess: () => {
      toast.success("Profile saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save profile.");
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-12 pb-16">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" /></div>
          <div className="md:col-span-2 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-16 max-w-5xl"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-3 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Your Career Profile</h1>
        <p className="text-muted-foreground text-sm max-w-[70ch] leading-relaxed font-medium">
          This is the primary information used by the AI to autofill application questions. Keep it up to date for the best automation results. Our parsing engine automatically updates this when you upload a primary resume.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        {/* Section 1 */}
        {/* Sections */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-x-8 gap-y-6 bg-card/30 p-6 md:p-8 rounded-[2rem] border border-border/40 shadow-sm">
          <div className="md:col-span-1 pt-2">
            <h3 className="text-lg font-bold text-foreground">Personal Details</h3>
            <p className="text-sm text-muted-foreground font-medium mt-2 pr-4 leading-relaxed">
              How recruiters and hiring managers can reach you. Used primarily for contact forms.
            </p>
          </div>
          <div className="md:col-span-2 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Full Name"
                placeholder="John Doe"
                error={errors.full_name?.message}
                {...register("full_name")}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="john.doe@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Phone Number"
                placeholder="+1 (555) 019-2834"
                error={errors.phone?.message}
                {...register("phone")}
              />
              <Input
                label="Location (City, Country)"
                placeholder="San Francisco, CA"
                error={errors.location?.message}
                {...register("location")}
              />
            </div>
          </div>
        </motion.div>

        {/* Section 2 */}
        {/* Sections */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-x-8 gap-y-6 bg-card/30 p-6 md:p-8 rounded-[2rem] border border-border/40 shadow-sm">
          <div className="md:col-span-1 pt-2">
            <h3 className="text-lg font-bold text-foreground">Professional Links</h3>
            <p className="text-sm text-muted-foreground font-medium mt-2 pr-4 leading-relaxed">
              Recruiters love looking at portfolios and professional history. Make sure these are public.
            </p>
          </div>
          <div className="md:col-span-2 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="LinkedIn URL"
                placeholder="https://linkedin.com/in/username"
                error={errors.linkedin_url?.message}
                {...register("linkedin_url")}
              />
              <Input
                label="GitHub URL"
                placeholder="https://github.com/username"
                error={errors.github_url?.message}
                {...register("github_url")}
              />
              <Input
                label="Portfolio/Personal Site"
                placeholder="https://myportfolio.dev"
                error={errors.portfolio_url?.message}
                {...register("portfolio_url")}
              />
            </div>
          </div>
        </motion.div>

        {/* Section 3 */}
        {/* Sections */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-x-8 gap-y-6 bg-card/30 p-6 md:p-8 rounded-[2rem] border border-border/40 shadow-sm">
          <div className="md:col-span-1 pt-2">
            <h3 className="text-lg font-bold text-foreground">Professional Summary</h3>
            <p className="text-sm text-muted-foreground font-medium mt-2 pr-4 leading-relaxed">
              A brief summary that highlights your career objectives and skills. AI uses this for 'Tell me about yourself' questions.
            </p>
          </div>
          <div className="md:col-span-2">
            <Textarea
              placeholder="Highly motivated Software Engineer with 5+ years of experience building modern web architectures..."
              rows={6}
              className="resize-y"
              error={errors.summary?.message}
              {...register("summary")}
            />
          </div>
        </motion.div>

        {/* Section 4 */}
        {/* Sections */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-x-8 gap-y-6 bg-card/30 p-6 md:p-8 rounded-[2rem] border border-border/40 shadow-sm">
          <div className="md:col-span-1 pt-2">
            <h3 className="text-lg font-bold text-foreground">Preferences</h3>
            <p className="text-sm text-muted-foreground font-medium mt-2 pr-4 leading-relaxed">
              Help matching tools recommend roles and set boundaries for salary questions.
            </p>
          </div>
          <div className="md:col-span-2 space-y-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Salary Expectation"
                placeholder="e.g. $140k - $160k"
                error={errors.salary_expectation?.message}
                {...register("salary_expectation")}
              />
              <Input
                label="Notice Period"
                placeholder="e.g. 2 weeks, Immediate"
                error={errors.notice_period?.message}
                {...register("notice_period")}
              />
              <Input
                label="Work Authorization"
                placeholder="e.g. US Citizen"
                error={errors.work_authorization?.message}
                {...register("work_authorization")}
              />
            </div>

            {/* Languages List */}
            <div className="rounded-2xl border border-border/50 bg-background/50 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Languages</h4>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Spoken and written languages you are proficient in.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendLanguage({ language: "", proficiency: "Fluent" })}
                  className="flex items-center gap-2 hover:border-primary/40 hover:bg-primary/5"
                >
                  <Plus className="size-4" /> Add Language
                </Button>
              </div>

              {languageFields.length === 0 ? (
                <div className="flex items-center justify-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/60">
                  <p className="text-xs text-muted-foreground font-semibold">No languages added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {languageFields.map((field, index) => (
                    <div key={field.id} className="flex flex-col sm:flex-row gap-4 sm:items-end bg-background p-4 rounded-xl border border-border/50 shadow-sm transition-all hover:border-primary/20">
                      <div className="flex-1 w-full sm:w-auto">
                        <Input
                          placeholder="e.g. Spanish"
                          error={(errors.languages as any)?.[index]?.language?.message}
                          {...register(`languages.${index}.language` as const)}
                        />
                      </div>
                      <div className="flex gap-4 items-end w-full sm:w-auto">
                        <div className="flex-1 sm:w-48">
                          <Input
                            placeholder="e.g. Native / Conversational"
                            error={(errors.languages as any)?.[index]?.proficiency?.message}
                            {...register(`languages.${index}.proficiency` as const)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLanguage(index)}
                          className="text-destructive hover:bg-destructive/10 shrink-0 mb-1"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div variants={itemVariants} className="flex justify-end pt-4 sticky bottom-6 z-10">
          <div className="bg-background/80 backdrop-blur-xl p-3 rounded-2xl border border-border/60 shadow-2xl flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-medium px-4">Don't forget to save your changes</span>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="px-10 h-12 shadow-primary-glow font-bold tracking-wide"
            >
              {mutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
