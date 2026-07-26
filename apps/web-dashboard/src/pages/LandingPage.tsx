import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@jobsa/ui";
import {
  ArrowRight,
  Check,
  FileText,
  Moon,
  Sparkles,
  ShieldCheck,
  Sun,
  Target,
  Zap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.js";

/* ────────────────────────────────────────────────────────────────────────
 * Hero demo data — a fictional application, used only to visualize how
 * JobSA fills a real multi-field ATS form (resume parse → match →
 * autofill → human review). No real applicant or company data.
 * ──────────────────────────────────────────────────────────────────────── */
interface FieldDef {
  label: string;
  value: string;
  multiline?: boolean;
}

const DEMO_FIELDS: FieldDef[] = [
  { label: "Full name", value: "Jordan Avery" },
  { label: "Email", value: "jordan.avery@gmail.com" },
  { label: "LinkedIn URL", value: "linkedin.com/in/jordanavery" },
  {
    label: "Why do you want to work here?",
    value:
      "My last two roles were spent building the exact kind of distributed data pipelines your platform team is scaling right now.",
    multiline: true,
  },
  { label: "Desired salary", value: "$165,000" },
];

const ATS_ROTATION = ["Greenhouse", "Lever", "Workday"] as const;

/* ────────────────────────────────────────────────────────────────────────
 * Theme toggle — persists to localStorage, falls back to the visitor's
 * system preference on first load. Toggling flips the `.dark` class on
 * <html>, which every color in this file already derives from via the
 * design system's CSS variables (bg-background, text-foreground, etc.).
 * ──────────────────────────────────────────────────────────────────────── */
type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "jobsa-theme";

function getInitialTheme(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const handler = () => setReduced(query.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function FieldRow({
  field,
  filled,
  active,
}: {
  field: FieldDef;
  filled: boolean;
  active: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {field.label}
        </span>
        <span
          className={`flex items-center gap-1 font-mono text-[10px] text-emerald-600 transition-opacity duration-300 dark:text-emerald-400 ${filled ? "opacity-100" : "opacity-0"
            }`}
        >
          <Check className="size-3" strokeWidth={2.5} />
          matched
        </span>
      </div>
      <div
        className={`relative rounded-lg border px-3 py-2 text-sm leading-relaxed transition-colors duration-500 ${filled
            ? "border-primary/25 bg-primary/[0.04]"
            : "border-border bg-muted/30"
          } ${field.multiline ? "min-h-[3.25rem]" : ""}`}
      >
        <span
          className={`transition-opacity duration-500 ${filled ? "opacity-100" : "opacity-0"
            }`}
        >
          {field.value}
        </span>
        {active && !filled && (
          <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-primary align-middle" />
        )}
      </div>
    </div>
  );
}

function AutofillPanel() {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [atsIndex, setAtsIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setStep(DEMO_FIELDS.length + 1);
      return;
    }

    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setStep(0);
      setAtsIndex((i) => i + 1);

      DEMO_FIELDS.forEach((_, i) => {
        timers.push(
          setTimeout(() => {
            if (alive) setStep(i + 1);
          }, 600 + i * 850)
        );
      });

      const reviewAt = 600 + DEMO_FIELDS.length * 850 + 500;
      timers.push(
        setTimeout(() => {
          if (alive) setStep(DEMO_FIELDS.length + 1);
        }, reviewAt)
      );
      timers.push(
        setTimeout(() => {
          if (alive) run();
        }, reviewAt + 2600)
      );
    };

    run();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [reducedMotion]);

  const allFilled = step >= DEMO_FIELDS.length;
  const reviewed = step > DEMO_FIELDS.length;
  const currentAts = ATS_ROTATION[atsIndex % ATS_ROTATION.length] ?? "Greenhouse";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          {currentAts} · Senior Product Designer
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
          Anchor Robotics
        </span>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {DEMO_FIELDS.map((field, i) => (
          <FieldRow
            key={field.label}
            field={field}
            filled={i < step}
            active={i === step}
          />
        ))}

        <div
          className={`flex items-center justify-between border-t border-border pt-4 transition-opacity duration-500 ${allFilled ? "opacity-100" : "opacity-0"
            }`}
        >
          <span className="text-xs text-muted-foreground">
            {reviewed ? "Submitted — you clicked review" : "Ready for your review"}
          </span>
          <Button size="sm" className={!reviewed ? "animate-pulse" : ""}>
            {reviewed ? (
              <>
                <Check className="size-3.5" /> Reviewed
              </>
            ) : (
              "Review & Submit"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: FileText,
    title: "Resume parsing & knowledge base",
    description:
      "Upload your resume once. JobSA extracts your experience, skills, and projects into a structured knowledge base it reuses across every application.",
  },
  {
    icon: Zap,
    title: "Cross-ATS autofill",
    description:
      "One browser extension, every platform. JobSA reads the fields on Greenhouse, Lever, and Workday forms and fills them — including long, free-text questions.",
  },
  {
    icon: Target,
    title: "Tailored match scoring",
    description:
      "Each role is scored against your background before you apply, so your time goes to the applications you're actually likely to hear back from.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-loop review",
    description:
      "AI drafts the answers, you approve them. Every application stops at a review screen — nothing is submitted without your click.",
  },
];

const STEPS = [
  {
    title: "Parse your resume",
    description:
      "Upload once. JobSA extracts your experience, skills, and projects into a career knowledge base it can draw on for any application.",
  },
  {
    title: "Match the role",
    description:
      "Every open position gets scored against your background, so you know where you're a genuine fit before you spend time applying.",
  },
  {
    title: "Autofill the application",
    description:
      "The extension reads each ATS form field-by-field and fills it from your knowledge base — short answers and long-form questions alike.",
  },
  {
    title: "Review, then submit",
    description:
      "Nothing sends automatically. You check the answers, edit anything you'd change, and click submit yourself.",
  },
];

const ATS_PLATFORMS = [
  "Greenhouse",
  "Lever",
  "Workday",
  "iCIMS",
  "SmartRecruiters",
  "SuccessFactors",
];

export function LandingPage() {
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const destination = session ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <header className="fixed left-0 top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              J
            </div>
            <span className="text-xl font-bold tracking-tight">
              Job<span className="text-primary">SA</span>
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it Works
            </a>
            <a href="#about" className="transition-colors hover:text-foreground">
              About
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
              }
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>

            {session ? (
              <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm font-medium transition-colors hover:text-primary sm:block"
                >
                  Sign In
                </Link>
                <Link to="/login">
                  <Button>Join Now</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full overflow-hidden pb-16 pt-32 lg:pb-28 lg:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_40%,transparent_100%)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-14 md:flex-row md:items-center md:gap-16">
            {/* Copy */}
            <div className="w-full space-y-7 md:w-1/2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-xs text-muted-foreground">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                ai copilot for job applications
              </div>

              <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
                AI fills it in.
                <br />
                <span className="text-primary">You hit submit.</span>
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                JobSA parses your resume once, then autofills Greenhouse,
                Lever, and Workday applications field-by-field — matched to
                the role, and reviewed by you before anything sends.
              </p>

              <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center">
                <Link to={destination}>
                  <Button size="lg" className="gap-2 px-7 text-base font-semibold">
                    Try it free
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  Free to start — nothing submits without your review.
                </span>
              </div>
            </div>

            {/* Signature autofill visualization */}
            <div className="w-full md:w-1/2">
              <AutofillPanel />
            </div>
          </div>
        </div>
      </section>

      {/* Works-with strip */}
      <section className="border-y border-border bg-muted/20 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-6 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground/70">
            Autofills applications across
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {ATS_PLATFORMS.map((name) => (
              <span
                key={name}
                className="text-lg font-semibold text-muted-foreground/50 transition-colors hover:text-foreground sm:text-xl"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-2xl space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From resume to submitted application
            </h2>
            <p className="text-lg text-muted-foreground">
              Four steps, and you're only ever one click away from the send button.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 top-6 hidden h-px bg-border lg:block" />
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative flex flex-col gap-4">
                  <div className="relative z-10 flex size-12 items-center justify-center rounded-full border border-border bg-background font-mono text-sm font-semibold text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-2xl space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to apply, without the busywork
            </h2>
            <p className="text-lg text-muted-foreground">
              JobSA replaces a dozen browser tabs and copy-pasted answers with one workflow.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card/50 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card"
              >
                <div className="mb-6 flex size-14 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="size-7 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{title}</h3>
                <p className="leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="size-6 text-primary" />
          </div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Built for people applying to more than one job
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Every ATS asks for the same information in a different shape.
            JobSA exists to remove that retyping — not the decisions. You
            still choose what to apply to, and you still hit submit.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-y border-border bg-primary/5 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Stop retyping your resume.
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Parse it once. Let JobSA handle the forms — you handle the decisions.
          </p>
          <Link to={destination}>
            <Button size="lg" className="gap-2 px-8 text-base font-semibold">
              Try it free
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
              J
            </div>
            <span className="text-base font-bold tracking-tight">
              Job<span className="text-primary">SA</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JobSA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}