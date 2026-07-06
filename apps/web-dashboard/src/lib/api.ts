import type { HealthResponse } from "@jobsa/shared";

const BACKEND_URL = "http://localhost:8000";

/**
 * Fetch backend health status.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${BACKEND_URL}/api/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Backend returned HTTP ${response.status}`);
  }

  return response.json();
}
