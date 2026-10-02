/**
 * ECDAT Live API Client
 *
 * Connects directly to the FastAPI backend at NEXT_PUBLIC_API_BASE (default: http://localhost:8000).
 * Rule 1 & Rule 10: Never fabricates data; returns live DB results or empty state.
 */
import {
  CryptoAssetItem,
  GraphNodeItem,
  GraphEdgeItem,
  MoscaRiskData,
  MigrationPlanItem,
  CBOMDocument,
  ScanSummaryItem,
  ProjectItem,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText} at ${endpoint}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.warn(`[ECDAT API] Request failed for ${endpoint}:`, err.message);
    throw err;
  }
}

/** Check backend health */
export async function getHealth(): Promise<{ status: string; mode: string; version: string }> {
  return apiFetch<{ status: string; mode: string; version: string }>("/health");
}

/** Get all projects */
export async function getProjects(): Promise<ProjectItem[]> {
  return apiFetch<ProjectItem[]>("/api/projects");
}

/** Get scans, optionally for a specific project */
export async function getScans(projectId?: string): Promise<ScanSummaryItem[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return apiFetch<ScanSummaryItem[]>(`/api/scans${query}`);
}

/** Get scan details by ID */
export async function getScan(scanId: string): Promise<ScanSummaryItem> {
  return apiFetch<ScanSummaryItem>(`/api/scans/${scanId}`);
}

/** Get all cryptographic assets discovered for a scan */
export async function getScanAssets(scanId: string): Promise<CryptoAssetItem[]> {
  const res = await apiFetch<any>(
    `/api/scans/${scanId}/assets`
  );
  return res.items || res.assets || [];
}

/** Get a single asset with full evidence provenance */
export async function getAsset(assetId: string): Promise<CryptoAssetItem> {
  return apiFetch<CryptoAssetItem>(`/api/assets/${assetId}`);
}

/** Get cryptographic dependency graph (nodes & edges) */
export async function getScanGraph(scanId: string): Promise<{ nodes: GraphNodeItem[]; edges: GraphEdgeItem[] }> {
  return apiFetch<{ scan_id: string; nodes: GraphNodeItem[]; edges: GraphEdgeItem[] }>(
    `/api/scans/${scanId}/graph`
  );
}

/** Get blast radius for a specific asset */
export async function getAssetBlastRadius(assetId: string): Promise<{
  origin_asset_id: string;
  affected_count: number;
  affected_nodes: Array<{ node_id: string; label: string; node_type: string; depth: number }>;
  is_prediction: boolean;
}> {
  return apiFetch(`/api/assets/${assetId}/blast-radius`);
}

/** Get Mosca risk assessment & Monte Carlo probabilities for a scan */
export async function getScanRisk(scanId: string): Promise<{
  scan_id: string;
  risk_label?: string;
  results: any[];
  assets: any[];
}> {
  const res = await apiFetch<any>(`/api/scans/${scanId}/risk`);
  const list = res.assets || res.results || [];
  return {
    ...res,
    results: list,
    assets: list,
  };
}

/** Get PQC migration plan with role-correct candidates, latency & cost */
export async function getScanMigrationPlan(scanId: string): Promise<{
  scan_id: string;
  impact_label: string;
  plans: Array<{
    asset_id: string;
    canonical_algorithm: string;
    candidates: Array<{
      candidate_algorithm: string;
      standard: string;
      family: string;
      usage_role_match: string;
      trade_offs: string[];
      compatibility_notes: string;
      latency?: {
        public_key_bytes: number;
        ciphertext_bytes?: number;
        signature_bytes?: number;
        estimated_handshake_overhead_ms: number;
        cpu_overhead_factor: number;
        comparison: string;
      };
      cost?: {
        bandwidth_per_exchange_kb: number;
        infrastructure_cost_impact: string;
        migration_complexity: string;
        estimated_cost_tier: string;
        details: string;
      };
    }>;
    waves: Array<{
      wave_number: number;
      priority: string;
      asset_ids: string[];
      rationale: string;
      estimated_effort_weeks: number;
    }>;
    blast_radius: any;
    simulation_state: any;
  }>;
}> {
  return apiFetch(`/api/scans/${scanId}/plan`);
}

/** Get CycloneDX 1.6/1.7 Cryptographic Bill of Materials */
export async function getScanCBOM(scanId: string): Promise<{ cbom: any; validation?: { is_valid: boolean; errors: string[] } }> {
  return apiFetch<any>(`/api/scans/${scanId}/cbom`);
}

/** Trigger a new scan */
export async function triggerScan(projectId: string, artifactIds: string[] = []): Promise<ScanSummaryItem> {
  return apiFetch<ScanSummaryItem>("/api/scans", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      artifact_ids: artifactIds,
      mode: "live",
    }),
  });
}

/** Create a new project */
export async function createProject(name: string, description?: string): Promise<ProjectItem> {
  return apiFetch<ProjectItem>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

/** Upload an artifact for a project */
export async function uploadArtifact(projectId: string, file: File, artifactType: string): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const res = await fetch(`${base}/api/projects/${projectId}/artifacts?artifact_type=${encodeURIComponent(artifactType)}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Upload failed with status ${res.status}`);
  }
  return res.json();
}

