import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@jobsa/ui";
import { motion, AnimatePresence } from "framer-motion";
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
  Chrome,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.js";
import { CHROME_WEBSTORE_URL } from "../lib/extension.js";
import { useTheme } from "../contexts/ThemeContext.js";

/* ────────────────────────────────────────────────────────────────────────
 * Data & Constants
 * ──────────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: FileText,
    title: "Resume Parsing Engine",
    description: "Your master knowledge base. Upload once, and we extract every nuance of your career.",
  },
  {
    icon: Zap,
    title: "Omni-ATS Autofill",
    description: "Greenhouse, Lever, Workday. One click fills entire applications accurately.",
  },
  {
    icon: Target,
    title: "Precision Matching",
    description: "Know your compatibility score before you spend time writing a single word.",
  },
  {
    icon: ShieldCheck,
    title: "Human Approval",
    description: "Nothing submits without you. Review every answer, edit, and send with confidence.",
  },
];

const STEPS = [
  { num: "01", title: "Parse", desc: "Build your knowledge base from a PDF." },
  { num: "02", title: "Match", desc: "Score roles against your exact profile." },
  { num: "03", title: "Autofill", desc: "The extension writes the answers." },
  { num: "04", title: "Review", desc: "You click submit. No ghosts." },
];

const ATS_PLATFORMS = ["Greenhouse", "Lever", "Workday", "iCIMS", "SmartRecruiters", "Ashby"];

/* ────────────────────────────────────────────────────────────────────────
 * Animation Variants (Custom Cubic-Bezier for Premium Feel)
 * ──────────────────────────────────────────────────────────────────────── */
const transitionPremium = { duration: 0.8, ease: [0.32, 0.72, 0, 1] };

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: transitionPremium,
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * Hero Autofill Demo (Redesigned)
 * ──────────────────────────────────────────────────────────────────────── */
const DEMO_FIELDS = [
  { label: "Full Name", value: "Jordan Avery" },
  { label: "Email", value: "jordan.avery@gmail.com" },
  { label: "Why this role?", value: "My background building distributed systems aligns perfectly with your platform scalability goals.", multiline: true },
];

function PremiumDemoPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let alive = true;
    const run = () => {
      setStep(0);
      setTimeout(() => alive && setStep(1), 1000);
      setTimeout(() => alive && setStep(2), 1800);
      setTimeout(() => alive && setStep(3), 2600);
      setTimeout(() => alive && setStep(4), 3800);
      setTimeout(() => alive && run(), 6000);
    };
    run();
    return () => { alive = false; };
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto md:mr-0">
      {/* Outer Shell (Double Bezel effect) */}
      <div className="rounded-[2.5rem] bg-card p-2 border border-border shadow-2xl relative z-10 overflow-hidden">
        {/* Inner Core */}
        <div className="rounded-[2rem] bg-background p-6 lg:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-border/50 relative overflow-hidden">
          
          {/* Subtle glowing orb inside the card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px]" />

          <div className="flex items-center gap-2 mb-8 relative z-10">
            <span className="flex size-2 relative">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              Greenhouse Auto-Fill
            </span>
          </div>

          <div className="space-y-6 relative z-10">
            {DEMO_FIELDS.map((field, i) => {
              const isFilled = step > i;
              const isActive = step === i;
              return (
                <div key={field.label} className="space-y-2 relative">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-semibold text-muted-foreground">{field.label}</label>
                    <AnimatePresence>
                      {isFilled && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0.8 }} 
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-[10px] text-primary flex items-center gap-1 font-mono uppercase"
                        >
                          <Check className="size-3" /> Inserted
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className={`relative w-full rounded-xl border px-4 py-3 text-sm transition-all duration-500 ${
                    isFilled ? "bg-primary/[0.04] border-primary/20 text-foreground" : "bg-muted/40 border-border text-transparent"
                  } ${field.multiline ? "min-h-[5rem]" : "h-11"}`}>
                    <span className="relative z-10">{isFilled ? field.value : ""}</span>
                    
                    {/* Active Scanning state */}
                    {isActive && (
                      <motion.div 
                        layoutId="scanner"
                        className="absolute inset-0 border border-primary/50 bg-primary/[0.02] rounded-xl shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="w-1 h-4 bg-primary absolute left-4 top-3.5 animate-pulse rounded-full" />
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <motion.div 
            className="mt-8 pt-6 border-t border-border/50 flex justify-end relative z-10"
            animate={{ opacity: step >= 3 ? 1 : 0.4 }}
          >
            <button className="bg-foreground text-background font-semibold text-sm px-6 py-2.5 rounded-full flex items-center gap-2 hover:scale-[0.98] transition-transform">
              {step >= 4 ? <Check className="size-4" /> : "Review & Submit"}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Main Page Component
 * ──────────────────────────────────────────────────────────────────────── */
export function LandingPage() {
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = session ? "/dashboard" : "/login";

  useEffect(() => {
    // Redirect signed-in users to the dashboard, UNLESS they explicitly navigated here from the logo
    if (session && !location.state?.fromLogo) {
      navigate("/dashboard");
    }
  }, [session, navigate, location.state]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      
      {/* Floating Glass Navigation */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
        className="fixed top-6 left-0 right-0 z-50 mx-auto w-max max-w-[calc(100vw-2rem)]"
      >
        <div className="flex h-14 items-center justify-between gap-8 rounded-full border border-border/50 bg-background/60 px-6 backdrop-blur-2xl shadow-glass">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Logo className="size-6" />
            <span className="text-base font-bold tracking-tight">
              Job<span className="text-primary">SA</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link to={destination}>
              <div className="group relative inline-flex items-center justify-center bg-foreground text-background rounded-full px-5 py-2 text-sm font-semibold transition-transform active:scale-95 cursor-pointer">
                {session ? "Dashboard" : "Sign In"}
              </div>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section — Ethereal Glass / Editorial Split Vibe */}
      <section className="relative pt-32 pb-20 lg:pt-36 lg:pb-32 px-6 min-h-[90vh] flex items-center">
        {/* Background ambient glowing orbs */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />
        
        <div className="mx-auto max-w-7xl w-full">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
            
            {/* Left: Massive Typography */}
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.div variants={fadeUpVariant} className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 font-mono text-xs font-medium text-muted-foreground backdrop-blur-md">
                <Sparkles className="size-3 text-primary" />
                <span>The intelligent application copilot</span>
              </motion.div>

              <motion.h1 variants={fadeUpVariant} className="text-[3.5rem] leading-[1.05] tracking-tight font-bold sm:text-6xl lg:text-[4.5rem] mb-6">
                AI fills it in.<br/>
                <span className="text-primary bg-clip-text">You hit submit.</span>
              </motion.h1>

              <motion.p variants={fadeUpVariant} className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
                Parse your resume once. Let JobSA seamlessly autofill Greenhouse, Lever, and Workday forms field-by-field. Nothing sends without your human review.
              </motion.p>

              <motion.div variants={fadeUpVariant} className="flex flex-wrap items-center gap-4">
                <Link to={destination}>
                  {/* Button-in-Button Pattern */}
                  <div className="group flex items-center gap-1 bg-primary text-primary-foreground rounded-full pl-6 pr-2 py-2 font-semibold text-base transition-transform active:scale-95 shadow-primary-glow cursor-pointer">
                    Try it free
                    <div className="flex size-8 items-center justify-center rounded-full bg-black/10 ml-2 group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="size-4" />
                    </div>
                  </div>
                </Link>
                <a
                  href={CHROME_WEBSTORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur-md px-6 py-3 font-semibold text-sm text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Chrome className="size-4" />
                  Chrome Extension
                  <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                </a>
                <p className="text-sm text-muted-foreground ml-2">No credit card required.</p>
              </motion.div>
            </motion.div>

            {/* Right: The Z-Axis Cascade Demo */}
            <motion.div 
              initial={{ opacity: 0, x: 40, filter: "blur(10px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
              className="relative w-full"
            >
              <PremiumDemoPanel />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ATS Platforms Marquee (Static elegant layout) */}
      <section className="border-y border-border/40 bg-muted/10 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Works effortlessly with
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {ATS_PLATFORMS.map((name, i) => (
              <motion.span 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                key={name} 
                className="text-lg font-bold text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                {name}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works (The Z-Axis Cascade cards) */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="mb-20 max-w-2xl"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">From PDF to submitted application.</h2>
            <p className="text-xl text-muted-foreground">Four precise steps. You're always in control.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div 
                key={step.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, ...transitionPremium } }
                }}
                className="group relative rounded-[2rem] bg-card border border-border p-8 hover:shadow-card-hover transition-all duration-500"
              >
                <div className="mb-12 font-mono text-xs font-semibold text-primary/50 group-hover:text-primary transition-colors">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features (Asymmetrical Bento) */}
      <section id="features" className="py-32 px-6 bg-muted/20 border-t border-border/40">
        <div className="mx-auto max-w-7xl">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">Everything you need. Nothing you don't.</h2>
            <p className="text-xl text-muted-foreground">Stop repeating yourself across a dozen browser tabs.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div 
                  key={feat.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    visible: { opacity: 1, scale: 1, transition: { delay: i * 0.1, ...transitionPremium } }
                  }}
                  className="rounded-[2rem] bg-card border border-border p-8 md:p-10 hover:border-primary/30 transition-colors duration-500"
                >
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-8">
                    <Icon className="size-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">{feat.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              J
            </div>
            <span className="text-base font-bold tracking-tight">
              JobSA
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JobSA. Engineered for precision.
          </p>
        </div>
      </footer>
    </div>
  );
}