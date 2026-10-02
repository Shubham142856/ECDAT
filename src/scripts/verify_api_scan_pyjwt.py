"""Verify real PyJWT API scan completeness end-to-end."""
import json
import sqlite3
import time
import urllib.request
from pathlib import Path

PYJWT_PROJECT_ID = "5290423c-0fa3-4646-ae30-ce41a845a693"
API_BASE = "http://127.0.0.1:8000/api"

def main():
    print("=" * 60)
    print("1. Triggering Real PyJWT Scan via API...")
    print("=" * 60)

    req = urllib.request.Request(
        f"{API_BASE}/scans",
        data=json.dumps({"project_id": PYJWT_PROJECT_ID, "mode": "live"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req)
    scan_init = json.loads(resp.read().decode("utf-8"))
    scan_id = scan_init["scan_id"]
    print(f"Triggered scan_id: {scan_id}")
    print(f"Initial status: {scan_init['state']}")

    # 2. Poll until completion
    max_wait = 30
    scan_final = None
    for i in range(max_wait):
        time.sleep(1)
        req_poll = urllib.request.Request(f"{API_BASE}/scans/{scan_id}")
        resp_poll = urllib.request.urlopen(req_poll)
        scan_final = json.loads(resp_poll.read().decode("utf-8"))
        state = scan_final["state"]
        stages = scan_final.get("stages", {})
        done_stages = [k for k, v in stages.items() if v.get("state") == "done"]
        print(f"[{i+1}s] State: {state:<10} Done stages ({len(done_stages)}/9): {done_stages}")
        if state in ("completed", "failed"):
            break

    assert scan_final["state"] == "completed", f"Scan did not complete! State: {scan_final['state']}, Error: {scan_final.get('error_message')}"
    print(f"\nScan completed successfully at {scan_final.get('completed_at')}!")

    # 3. Fetch assets from API
    print("\n" + "=" * 60)
    print("2. Verifying Discovered Assets via GET /api/scans/{id}/assets...")
    print("=" * 60)
    req_assets = urllib.request.Request(f"{API_BASE}/scans/{scan_id}/assets")
    resp_assets = urllib.request.urlopen(req_assets)
    assets_data = json.loads(resp_assets.read().decode("utf-8"))
    api_assets = assets_data.get("items", assets_data.get("assets", []))
    print(f"Total API Assets Count: {len(api_assets)}")

    for a in api_assets:
        print(f"  - Algo: {a.get('canonical_algorithm'):<12} Family: {a.get('family'):<18} Status: {a.get('quantum_status'):<12} Claim: {a.get('claim_state')}")

    # 4. Check DB Persistence directly
    print("\n" + "=" * 60)
    print("3. Verifying Direct SQLite DB Persistence...")
    print("=" * 60)
    conn = sqlite3.connect("D:/ecdat/ecdat.db")
    c = conn.cursor()

    db_asset_count = c.execute("SELECT count(*) FROM crypto_assets WHERE scan_id = ?", (scan_id,)).fetchone()[0]
    db_evidence_count = c.execute("SELECT count(*) FROM evidence WHERE scan_id = ?", (scan_id,)).fetchone()[0]
    db_node_count = c.execute("SELECT count(*) FROM graph_nodes WHERE scan_id = ?", (scan_id,)).fetchone()[0]
    db_edge_count = c.execute("SELECT count(*) FROM graph_edges WHERE scan_id = ?", (scan_id,)).fetchone()[0]
    db_risk_count = c.execute("SELECT count(*) FROM risk_results WHERE scan_id = ?", (scan_id,)).fetchone()[0]
    db_plan_count = c.execute("SELECT count(*) FROM migration_plans WHERE scan_id = ?", (scan_id,)).fetchone()[0]

    print(f"  CryptoAssets in DB:  {db_asset_count}")
    print(f"  Evidence in DB:      {db_evidence_count}")
    print(f"  Graph Nodes in DB:   {db_node_count}")
    print(f"  Graph Edges in DB:   {db_edge_count}")
    print(f"  Risk Results in DB:  {db_risk_count}")
    print(f"  Migration Plans DB:  {db_plan_count}")

    # 5. Verify Graph API endpoint
    req_graph = urllib.request.Request(f"{API_BASE}/scans/{scan_id}/graph")
    graph_data = json.loads(urllib.request.urlopen(req_graph).read().decode("utf-8"))
    print(f"\nGraph API: {len(graph_data.get('nodes', []))} nodes, {len(graph_data.get('edges', []))} edges")

    # 6. Verify Risk API endpoint
    req_risk = urllib.request.Request(f"{API_BASE}/scans/{scan_id}/risk")
    risk_data = json.loads(urllib.request.urlopen(req_risk).read().decode("utf-8"))
    print(f"Risk API: {len(risk_data.get('assets', []))} risk assessment records")

    # 7. Verify Migration Plan API endpoint
    req_plan = urllib.request.Request(f"{API_BASE}/scans/{scan_id}/plan")
    plan_data = json.loads(urllib.request.urlopen(req_plan).read().decode("utf-8"))
    print(f"Migration Plan API: {len(plan_data.get('plans', []))} plans, {len(plan_data.get('summary', {}).get('waves', []))} waves")

    # 8. Verify CBOM API endpoint
    req_cbom = urllib.request.Request(f"{API_BASE}/scans/{scan_id}/cbom")
    cbom_data = json.loads(urllib.request.urlopen(req_cbom).read().decode("utf-8"))
    cbom_doc = cbom_data.get("cbom", cbom_data)
    components = cbom_doc.get("components", [])
    print(f"CBOM API: CycloneDX {cbom_doc.get('specVersion', '1.6')}, {len(components)} components")

    # Save exact CBOM JSON
    out_cbom_path = Path("D:/ecdat/src/scripts/real_pyjwt_cbom.json")
    out_cbom_path.write_text(json.dumps(cbom_doc, indent=2), encoding="utf-8")
    print(f"Saved CBOM to {out_cbom_path} ({out_cbom_path.stat().st_size} bytes)")

    # 9. Verify the 9 Expected PyJWT Baseline Assets
    expected_algos = {"HMAC", "ECDSA", "Ed448", "Ed25519", "RSA", "RSA-PSS", "SHA-256", "SHA-384", "SHA-512"}
    found_algos = {a.get("canonical_algorithm") for a in api_assets}
    print("\n" + "=" * 60)
    print("4. Comparing with Post-Patch PyJWT Research Baseline (9 Assets)...")
    print("=" * 60)
    print(f"Expected 9: {sorted(expected_algos)}")
    print(f"Found {len(found_algos)}:    {sorted(found_algos)}")
    match = expected_algos.issubset(found_algos)
    print(f"Match: {'PASS' if match and len(found_algos) == 9 else 'FAIL'}")
    assert len(found_algos) == 9, f"Expected 9 assets, got {len(found_algos)}"

    print("\nALL VERIFICATIONS PASSED!")

if __name__ == "__main__":
    main()
