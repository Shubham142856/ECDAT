export type AssetRole =
  | "capability"
  | "implementation"
  | "usage"
  | "configuration"
  | "observed";

export type QuantumStatus = "vulnerable" | "safe" | "hybrid" | "conditionally_safe" | "unknown";
export type ClaimState = "supported" | "ambiguous" | "contradictory" | "insufficient_evidence";

export interface EvidenceRecord {
  evidence_id: string;
  source_type: string;
  source_location: string;
  detector: string;
  raw_signal: string;
  normalized_claim: string;
  roles: AssetRole[];
  confidence: number;
  provenance: Record<string, any>;
}

export interface CryptoAssetItem {
  asset_id: string;
  scan_id: string;
  canonical_algorithm: string;
  family: string;
  variant?: string;
  parameters?: Record<string, any>;
  quantum_status: QuantumStatus;
  claim_state: ClaimState;
  confidence: number;
  roles: AssetRole[];
  usage_role?: string;
  lifecycle?: string;
  evidence_count?: number;
  source_corpus?: string;
  context?: {
    service?: string;
    environment?: string;
    criticality?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    repository?: string;
    commit?: string;
  };
  evidence_records?: EvidenceRecord[];
}

export interface GraphNodeItem {
  id: string;
  node_id?: string;
  label: string;
  type: string;
  node_type?: string;
  properties?: Record<string, any>;
  algorithm?: string;
  status?: QuantumStatus;
  risk?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence?: number;
  x?: number;
  y?: number;
}

export interface GraphEdgeItem {
  id: string;
  edge_id?: string;
  source: string;
  target: string;
  source_node_id?: string;
  target_node_id?: string;
  label?: string;
  edge_type?: string;
  properties?: Record<string, any>;
  animated?: boolean;
}

export interface MoscaRiskData {
  x_secrecy?: number;
  y_migration?: number;
  z_crqc?: number;
  at_risk_baseline?: boolean;
  probability?: number;
  context_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown?: {
    quantum_exposure?: number;
    data_sensitivity?: number;
    business_criticality?: number;
    internet_exposure?: number;
    blast_radius?: number;
    migration_difficulty?: number;
  };
}

export interface LatencyMetrics {
  public_key_bytes?: number;
  ciphertext_bytes?: number;
  signature_bytes?: number;
  estimated_handshake_overhead_ms?: number;
  cpu_overhead_factor?: number;
  comparison?: string;
}

export interface CostMetrics {
  bandwidth_per_exchange_kb?: number;
  infrastructure_cost_impact?: string;
  migration_complexity?: string;
  estimated_cost_tier?: string;
  details?: string;
}

export interface MigrationCandidateItem {
  candidate_algorithm: string;
  standard: string;
  status?: string;
  family: string;
  usage_role_match: string;
  security_category?: number;
  trade_offs: string[];
  compatibility_notes: string;
  impact_label: string;
  latency?: LatencyMetrics;
  cost?: CostMetrics;
}

export interface MigrationWaveItem {
  wave_number: number;
  title?: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  asset_ids: string[];
  target_algorithms?: string[];
  rationale: string;
  estimated_effort_weeks?: number;
  blast_radius_count?: number;
}

export interface MigrationPlanItem {
  asset_id: string;
  canonical_algorithm: string;
  candidates: MigrationCandidateItem[];
  waves: MigrationWaveItem[];
  blast_radius: any;
  simulation_state?: any;
}

export interface ProjectItem {
  project_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface ScanSummaryItem {
  scan_id: string;
  project_id: string;
  state: string;
  stages: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface CBOMComponent {
  type: string;
  name: string;
  version?: string;
  cryptoProperties?: {
    assetType?: string;
    algorithmProperties?: {
      primitive?: string;
      parameterSetIdentifier?: string;
      curve?: string;
      executionEnvironment?: string;
      implementationPlatform?: string;
      certificationLevel?: string[];
      mode?: string;
      padding?: string;
      cryptoFunctions?: string[];
      classicalSecurityLevel?: number;
      nistQuantumSecurityLevel?: number;
    };
  };
  evidence?: {
    occurrences?: Array<{
      location: string;
      line?: number;
      offset?: number;
    }>;
  };
}

export interface CBOMDocument {
  bomFormat: "CycloneDX";
  specVersion: "1.6";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor?: string; name: string; version: string }>;
    component: { name: string; type: string };
  };
  components: CBOMComponent[];
  dependencies?: Array<{ ref: string; dependsOn: string[] }>;
}
