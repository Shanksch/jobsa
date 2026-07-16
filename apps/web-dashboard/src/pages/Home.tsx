import { useQuery } from "@tanstack/react-query";
import { Button } from "@jobsa/ui";
import type { HealthResponse } from "@jobsa/shared";
import { fetchHealth } from "../lib/api";

export function Home() {
  const {
    data: health,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  const status = isLoading ? "checking" : isError ? "disconnected" : "connected";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          {/* Logo mark */}
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/10">
            <svg
              className="size-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Job<span className="text-primary">SA</span>
          </h1>
          <p className="mt-3 max-w-md text-lg text-muted-foreground">
            AI-powered job application copilot. Autofill smarter, apply faster,
            land interviews.
          </p>
        </div>

        {/* Status Card */}
        <div className="mx-auto mt-12 max-w-md">
          <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                System Status
              </h2>
              <div className="flex items-center gap-2">
                <div
                  className={`size-2.5 rounded-full transition-all duration-500 ${
                    status === "connected"
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      : status === "checking"
                        ? "bg-amber-400 animate-pulse"
                        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  }`}
                />
                <span className="text-xs font-medium capitalize text-muted-foreground">
                  {status === "connected"
                    ? "All systems operational"
                    : status === "checking"
                      ? "Checking..."
                      : "Backend unreachable"}
                </span>
              </div>
            </div>

            {health && (
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Version
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {health.version}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Last Check
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {new Date(health.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {isError && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-3">
                <p className="text-xs text-destructive">
                  <span className="font-semibold">Error: </span>
                  {error instanceof Error ? error.message : "Failed to connect"}
                </p>
                <p className="mt-1 text-[11px] text-destructive/70">
                  Make sure the backend is running:{" "}
                  <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono">
                    uvicorn app.main:app --reload --port 8000
                  </code>
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => refetch()}
              >
                <svg
                  className="size-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                  />
                </svg>
                Refresh
              </Button>
              <Button size="sm" className="flex-1" disabled>
                <svg
                  className="size-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
                Profile (Phase 1)
              </Button>
            </div>
          </div>

          {/* Phase info */}
          <p className="mt-6 text-center text-xs text-muted-foreground/50">
            Phase 1 — Career Knowledge Base + Profile CRUD + Resume Manager
          </p>
        </div>
      </div>
    </div>
  );
}
