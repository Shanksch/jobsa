import { useForm, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Textarea,
  Button,
  Separator,
} from "@jobsa/ui";
import { profileSchema } from "@jobsa/shared/schemas";
import { api } from "../lib/api.js";

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
    // Basic sanitizing
    mutation.mutate(data);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-sm text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Career Profile</h1>
        <p className="text-muted-foreground mt-1">
          This is the primary information used by the AI to autofill application questions.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal & Contact Information</CardTitle>
            <CardDescription>How recruiters and hiring managers can reach you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
            <div className="grid gap-4 md:grid-cols-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Links</CardTitle>
            <CardDescription>Recruiters love looking at portfolios and professional history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Summary</CardTitle>
            <CardDescription>A brief summary that highlights your career objectives and skills.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Highly motivated Software Engineer with 5+ years of experience building modern web architectures..."
              rows={4}
              error={errors.summary?.message}
              {...register("summary")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences & Expectations</CardTitle>
            <CardDescription>Help matching tools recommend roles and set boundaries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Salary Expectation"
                placeholder="e.g. $140,000 - $160,000"
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
                label="Work Authorization/Visa Status"
                placeholder="e.g. US Citizen, H1-B Visa"
                error={errors.work_authorization?.message}
                {...register("work_authorization")}
              />
            </div>

            <Separator />

            {/* Languages List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground">Languages</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendLanguage({ language: "", proficiency: "Fluent" })}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" /> Add Language
                </Button>
              </div>

              {languageFields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No languages added yet.</p>
              ) : (
                <div className="space-y-3">
                  {languageFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="e.g. Spanish"
                          error={(errors.languages as any)?.[index]?.language?.message}
                          {...register(`languages.${index}.language` as const)}
                        />
                      </div>
                      <div className="w-48">
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
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="px-6"
          >
            {mutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
