import { useState, useEffect, useCallback } from "react";
import { Button } from "@jobsa/ui";
import type { HealthResponse } from "@jobsa/shared";

const DEFAULT_BACKEND_URL = "https://jobsa-backend.onrender.com";

async function getBackendUrl(): Promise<string> {
  const { backend_url } = await chrome.storage.local.get('backend_url');
  return backend_url || DEFAULT_BACKEND_URL;
}

type ConnectionStatus = "checking" | "waking_up" | "connected" | "disconnected";

export function Popup() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus("checking");
    setError(null);

    const BACKEND_URL = await getBackendUrl();
    const MAX_RETRIES = 4;
    const BASE_DELAY_MS = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/health`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000), // increase from 5s to 10s for cold starts
        });

        if (response.status === 502 || response.status === 503 || response.status === 504) {
          if (attempt < MAX_RETRIES) {
            setStatus("waking_up");
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: HealthResponse = await response.json();
        setHealth(data);
        setStatus("connected");
        return;
      } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch" && attempt < MAX_RETRIES) {
          setStatus("waking_up");
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        if (attempt >= MAX_RETRIES) {
          setStatus("disconnected");
          setError("Backend is still starting up. Please try again in a moment.");
        }
      }
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div className="flex flex-col gap-4 p-5 bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <svg
            className="size-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">JobSA</h1>
          <p className="text-xs text-muted-foreground">
            AI Job Application Copilot
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Backend Status</span>
          <div className="flex items-center gap-2">
            <div
              className={`size-2.5 rounded-full transition-colors duration-300 ${
                status === "connected"
                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                  : status === "waking_up"
                    ? "bg-amber-400 animate-pulse"
                    : status === "checking"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-red-500"
              }`}
            />
            <span className="text-xs text-muted-foreground capitalize">
              {status === "waking_up" ? "waking up…" : status}
            </span>
          </div>
        </div>

        {health && (
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-mono">{health.version}</span>
            </div>
            <div className="flex justify-between">
              <span>Timestamp</span>
              <span className="font-mono">
                {new Date(health.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={checkHealth}
        >
          Refresh
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => window.open("https://jobsa-web-dashboard.vercel.app", "_blank")}
        >
          Open Dashboard
        </Button>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-muted-foreground/60">
        Phase 0 — Extension ↔ Backend Round Trip
      </p>
    </div>
  );
}
