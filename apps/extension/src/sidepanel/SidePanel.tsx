import { useState, useEffect, useCallback } from "react";
import { Button, Select, Logo, cn } from "@jobsa/ui";

type ConnectionStatus = "checking" | "waking_up" | "connected" | "disconnected";

interface ResumeItem {
  id: string;
  name: string;
  file_name: string;
  is_primary: boolean;
}

export function SidePanel() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [hasForm, setHasForm] = useState(false);
  const [jobTitle, setJobTitle] = useState("Unknown Role");
  const [company, setCompany] = useState("Unknown Company");
  const [pageUrl, setPageUrl] = useState("");
  
  const [isMatching, setIsMatching] = useState(false);
  const [matchScore, setMatchScore] = useState<{ score: number; justification: string } | null>(null);
  
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillProgress, setAutofillProgress] = useState("");
  const [results, setResults] = useState<{ label: string; filled: boolean; fieldId: string }[] | null>(null);
  const [generatedAnswers, setGeneratedAnswers] = useState<any>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // 1. Initial Load: Check auth, fetch resumes, connect to active tab
  useEffect(() => {
    checkHealthAndResumes();
    pollActiveTab();
    const interval = setInterval(pollActiveTab, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkHealthAndResumes = useCallback(async () => {
    setStatus("checking");
    setError(null);
    chrome.runtime.sendMessage({ action: "list_resumes" }, (response) => {
      if (chrome.runtime.lastError || response?.error) {
        setStatus("disconnected");
        setError(chrome.runtime.lastError?.message || response?.error || "Disconnected from backend");
      } else {
        setStatus("connected");
        const list: ResumeItem[] = response || [];
        setResumes(list);
        if (list.length > 0) {
          const primary = list.find(r => r.is_primary);
          setSelectedResume(primary ? primary.id : list[0]!.id);
        }
      }
    });
  }, []);

  const pollActiveTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE" }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res) {
        // If multiple frames respond, only trust the one that actually has a form
        if (res.hasForm) {
          setHasForm(true);
          setJobTitle(res.jobTitle);
          setCompany(res.company);
          setPageUrl(res.url);
        } else if (res.isTopFrame) {
          // If no frame has reported a form yet, we can safely set the top frame's metadata
          // But NEVER let a background iframe overwrite the UI with "recaptcha"
          setJobTitle(res.jobTitle);
          setCompany(res.company);
          setPageUrl(res.url);
        }
      }
    });
  };

  const handleMatch = async () => {
    if (!selectedResume) return;
    setIsMatching(true);
    setMatchScore(null);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");

      // Get JD from content script
      const jdResponse = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(tab.id!, { action: "GET_JOB_DESCRIPTION" }, resolve);
      });

      if (!jdResponse?.text) {
        throw new Error("Could not extract job description from page");
      }

      // Send to backend
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          action: "job_match",
          payload: { resume_id: selectedResume, job_description: jdResponse.text }
        }, resolve);
      });

      if (response.error) throw new Error(response.error);
      
      setMatchScore({
        score: response.score,
        justification: response.justification
      });
    } catch (err: any) {
      setError(err.message || "Match scoring failed");
    } finally {
      setIsMatching(false);
    }
  };

  const handleAutofill = async () => {
    if (!selectedResume) return;
    setIsAutofilling(true);
    setResults(null);
    setError(null);
    setAutofillProgress("Extracting form...");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");

      // 2. Extract schema from ALL frames using an aggregation listener
      const allFields: any[] = [];
      const schemaListener = (msg: any, sender: chrome.runtime.MessageSender) => {
        if (msg.action === "REPORT_FORM_SCHEMA" && sender.tab?.id === tab.id) {
          allFields.push(...msg.fields);
        }
      };
      chrome.runtime.onMessage.addListener(schemaListener);
      
      chrome.tabs.sendMessage(tab.id, { action: "GET_FORM_SCHEMA" });
      await new Promise(resolve => setTimeout(resolve, 500));
      chrome.runtime.onMessage.removeListener(schemaListener);

      const schemaResponse = { fields: allFields };

      if (!schemaResponse.fields || schemaResponse.fields.length === 0) {
        throw new Error("No form fields detected on this page.");
      }

      setAutofillProgress("Thinking (JobSA AI)...");

      // Ask backend to autofill
      const fillResponse = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          action: "autofill",
          payload: { url: pageUrl || "https://unknown-job-board.com", fields: schemaResponse.fields, resume_id: selectedResume }
        }, resolve);
      });

      if (fillResponse.error) throw new Error(fillResponse.error);

      setAutofillProgress("Injecting answers...");

      // 4. Inject answers into ALL frames using an aggregation listener
      const allResults: any[] = [];
      const injectListener = (msg: any, sender: chrome.runtime.MessageSender) => {
        if (msg.action === "REPORT_INJECT_RESULTS" && sender.tab?.id === tab.id) {
          allResults.push(...msg.results);
        }
      };
      chrome.runtime.onMessage.addListener(injectListener);
      
      chrome.tabs.sendMessage(tab.id, { 
        action: "INJECT_ANSWERS", 
        answers: fillResponse.answers,
        fields: schemaResponse.fields 
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      chrome.runtime.onMessage.removeListener(injectListener);

      const injectResponse = { results: allResults };
      setResults(injectResponse.results);
      setGeneratedAnswers(fillResponse.answers);
      setIsSaved(false); // Reset saved state for new autofills
      
      // Removed the auto-save draft functionality!
    } catch (err: any) {
      setError(err.message || "Autofill failed");
    } finally {
      setIsAutofilling(false);
      setAutofillProgress("");
    }
  };

  const focusField = async (fieldId: string) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "FOCUS_FIELD", fieldId });
    }
  };

  const handleSaveApplication = async () => {
    if (!selectedResume || isSaved) return;
    setIsSaving(true);
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          action: "create_application",
          payload: { 
            company, 
            role: jobTitle, 
            posting_url: pageUrl || "https://unknown-job-board.com", 
            resume_id: selectedResume, 
            generated_answers: generatedAnswers || {} 
          }
        }, resolve);
      });
      if (response?.error) throw new Error(response.error);
      setIsSaved(true);
    } catch (err: any) {
      setError(err.message || "Failed to save application");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/50">
        <div className="flex size-8 items-center justify-center shrink-0">
          <Logo className="size-8" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold tracking-tight leading-none">JobSA Copilot</h1>
        </div>
        <div className="flex items-center gap-2" title={status}>
          <div className={`size-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Context */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Detected Job</p>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="font-semibold text-sm">{company}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{jobTitle}</p>
          </div>
        </div>

        {/* Profile Selection */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Selected Resume</p>
          <Select 
            value={selectedResume} 
            onChange={(e) => setSelectedResume(e.target.value)} 
            disabled={resumes.length === 0}
            options={resumes.map(r => ({ label: r.name, value: r.id }))}
          />
        </div>

        {/* Match Scoring */}
        <div className="space-y-3 pt-2">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleMatch}
            disabled={isMatching || !selectedResume}
          >
            {isMatching ? "Analyzing Match..." : "Analyze Job Match"}
          </Button>
          
          {matchScore && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Match Score</span>
                <span className={`text-lg font-bold ${matchScore.score >= 75 ? 'text-emerald-500' : matchScore.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {matchScore.score}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {matchScore.justification}
              </p>
            </div>
          )}
        </div>

        <hr className="border-border" />

        {/* Autofill */}
        <div className="space-y-3">
          <Button 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold" 
            onClick={handleAutofill}
            disabled={isAutofilling || !selectedResume || !hasForm}
          >
            {isAutofilling ? "Filling..." : (hasForm ? "✨ Autofill Application" : "No Form Detected")}
          </Button>

          {autofillProgress && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              {autofillProgress}
            </p>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-500">
              {error}
            </div>
          )}

          {/* Results List */}
          {results && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold flex justify-between">
                  <span>Filled Fields ({results.filter(r => r.filled).length}/{results.length})</span>
                </p>
                <div className="space-y-1">
                  {results.map((r, i) => (
                    <div 
                      key={i}
                      onClick={() => focusField(r.fieldId)}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-xs"
                    >
                      <span className={r.filled ? 'text-emerald-500' : 'text-amber-500'}>
                        {r.filled ? '✓' : '⚠'}
                      </span>
                      <span className="truncate flex-1">{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <hr className="border-border" />
              
              <div className="space-y-2 bg-card border border-border p-3 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium text-center">
                  Once you have submitted the application on the job board, click below to log it in JobSA.
                </p>
                <Button 
                  className={cn("w-full font-semibold", isSaved ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 cursor-default" : "bg-primary text-primary-foreground")} 
                  onClick={handleSaveApplication}
                  disabled={isSaving || isSaved}
                >
                  {isSaving ? "Saving..." : isSaved ? "✓ Marked as Applied" : "Mark as Applied"}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
