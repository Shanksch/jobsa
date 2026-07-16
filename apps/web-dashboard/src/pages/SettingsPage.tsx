import { Card } from "@jobsa/ui";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your JobSA copilot preferences.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Extension Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autofill Tone</p>
              <p className="text-sm text-muted-foreground">
                The tone JobSA uses when generating answers.
              </p>
            </div>
            <select className="border border-input rounded-md px-3 py-1.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="professional">Professional (Default)</option>
              <option value="casual">Casual</option>
              <option value="direct">Direct & Concise</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-Submit</p>
              <p className="text-sm text-muted-foreground">
                Automatically submit applications after filling (Not Recommended).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" disabled />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-50 cursor-not-allowed"></div>
            </label>
          </div>
        </div>
      </Card>
      
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Account settings and billing will be available in Phase 3.
          </div>
        </div>
      </Card>
    </div>
  );
}
