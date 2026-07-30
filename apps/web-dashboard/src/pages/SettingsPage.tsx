import { Card } from "@jobsa/ui";
import { motion } from "framer-motion";

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

export function SettingsPage() {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-16 max-w-4xl"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-3 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm max-w-[65ch] leading-relaxed font-medium">
          Manage your JobSA copilot preferences and account settings.
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-card/30 p-8 rounded-[2rem] border border-border/40 shadow-sm space-y-8">
          <div>
            <h2 className="text-lg font-bold text-foreground">Extension Preferences</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure how the AI copilot interacts with job boards.</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start justify-between bg-background/50 p-5 rounded-2xl border border-border/50">
              <div className="pr-4">
                <p className="font-bold text-foreground">Autofill Tone</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  The tone JobSA uses when generating long-form answers for 'Tell me about yourself' or cover letter fields.
                </p>
              </div>
              <select className="border border-border rounded-xl px-4 py-2.5 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm">
                <option value="professional">Professional (Default)</option>
                <option value="casual">Casual & Personable</option>
                <option value="direct">Direct & Concise</option>
              </select>
            </div>
            
            <div className="flex items-start justify-between bg-background/50 p-5 rounded-2xl border border-border/50">
              <div className="pr-4">
                <p className="font-bold text-foreground flex items-center gap-2">
                  Auto-Submit
                  <span className="text-[9px] uppercase tracking-widest bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20">Beta</span>
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Automatically submit applications after the AI fills them. We highly recommend reviewing answers manually instead.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed mt-1">
                <input type="checkbox" className="sr-only peer" disabled />
                <div className="w-12 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-50 shadow-inner"></div>
              </label>
            </div>
          </div>
        </Card>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <Card className="bg-card/30 p-8 rounded-[2rem] border border-border/40 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Account & Billing</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your subscription and billing details.</p>
          </div>
          
          <div className="bg-muted/20 p-8 rounded-2xl border-2 border-dashed border-border/60 text-center flex flex-col items-center justify-center space-y-2">
            <span className="text-xs uppercase tracking-widest font-bold text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">Coming Soon</span>
            <p className="text-sm font-semibold text-foreground">Account management is launching in Phase 3</p>
            <p className="text-xs text-muted-foreground font-medium max-w-sm">We are currently finalizing our payment providers. Your account is completely free to use during the beta period.</p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
