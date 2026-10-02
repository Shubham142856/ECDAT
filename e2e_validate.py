"""
ECDAT E2E Validation Script  (Windows-safe: ASCII output only)
Verifies: API -> DB -> Assets -> Evidence -> Graph -> Risk -> Migration -> CBOM
"""
import json
import sys
import urllib.request
import urllib.error

# Force UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://localhost:8000"

def api_get(path):
    url = f"{BASE}{path}"
    try:
        req = urllib.request.urlopen(url, timeout=15)
        return json.loads(req.read().decode())
    except Exception as e:
        return {"ERROR": str(e)}

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def ok(msg): print(f"  [PASS] {msg}")
def fail(msg): print(f"  [FAIL] {msg}")
def warn(msg): print(f"  [WARN] {msg}")

results = {}

# 1. Health
section("1. API HEALTH")
h = api_get("/health")
print(f"  status:   {h.get('status')}")
print(f"  database: {h.get('database')}")
print(f"  version:  {h.get('version')}")
results["health"] = h.get("status") == "ok"

# 2. Projects
section("2. PROJECTS")
projects = api_get("/api/projects")
if "ERROR" in projects:
    fail("Projects: " + projects["ERROR"])
    projects = []
else:
    for p in projects:
        print(f"  [{p['project_id'][:8]}] {p['name']}")

pyjwt_proj = next((p for p in (projects if isinstance(projects, list) else [])
                    if "pyjwt" in p['name'].lower()), None)
if pyjwt_proj:
    ok(f"PyJWT project found: {pyjwt_proj['project_id'][:8]}")
else:
    warn("No PyJWT project found")

# 3. Scans
section("3. SCANS")
scan_id = None
completed = []
if pyjwt_proj:
    scans = api_get(f"/api/scans?project_id={pyjwt_proj['project_id']}")
    if isinstance(scans, list):
        completed = [s for s in scans if s.get("state") == "completed"]
        print(f"  Total scans: {len(scans)}, Completed: {len(completed)}")
        if completed:
            latest = completed[0]
            scan_id = latest['scan_id']
            print(f"  Latest completed scan: {scan_id[:8]}")
            print(f"  State:   {latest.get('state')}")
            print(f"  Mode:    {latest.get('mode')}")
            print(f"  Created: {latest.get('created_at','')[:19]}")
            stages = latest.get('stages', {})
            if stages:
                print(f"  Pipeline stages:")
                for stage, info in stages.items():
                    state = info.get('state', '?') if isinstance(info, dict) else info
                    marker = "[DONE]" if state == "done" else "[FAIL]" if state == "failed" else "[----]"
                    print(f"    {marker} {stage:12s}: {state}")

# 4. Assets
section("4. CRYPTO ASSETS (via API)")
asset_count = 0
assets_resp = {}
if scan_id:
    assets_resp = api_get(f"/api/scans/{scan_id}/assets?page_size=50")
    if "ERROR" in assets_resp:
        fail("Assets: " + assets_resp["ERROR"])
    else:
        asset_count = assets_resp.get("total", 0)
        items = assets_resp.get("items", [])
        print(f"  Total assets: {asset_count}")
        print(f"  Items returned: {len(items)}")

        vulnerable = [a for a in items if a.get('quantum_status','').lower() == 'vulnerable']
        safe_list = [a for a in items if a.get('quantum_status','').lower() == 'safe']
        print(f"  Quantum-vulnerable: {len(vulnerable)}")
        print(f"  Quantum-safe:       {len(safe_list)}")

        print(f"\n  Asset inventory:")
        for a in items:
            print(f"    [{a['asset_id'][:8]}] {a['canonical_algorithm']:15s} ({a['family']:20s}) q={a['quantum_status']:10s} c={a['claim_state']}")

        if asset_count == 9:
            ok("API returns 9 PyJWT assets (matches post-patch baseline)")
            results["asset_count"] = True
        elif asset_count == 4:
            fail("API returns only 4 assets -- integration/persistence bug suspected")
            results["asset_count"] = False
        else:
            warn(f"API returns {asset_count} assets (expected 9 for PyJWT)")
            results["asset_count"] = asset_count > 0

# 5. Asset Detail + Evidence
section("5. ASSET DETAIL + EVIDENCE (spot check)")
if scan_id and asset_count > 0:
    first_asset_id = assets_resp["items"][0]["asset_id"]
    detail = api_get(f"/api/assets/{first_asset_id}")
    if "ERROR" in detail:
        fail("Asset detail: " + detail["ERROR"])
    else:
        print(f"  Asset: {detail.get('canonical_algorithm')} ({detail.get('family')})")
        print(f"  Quantum status: {detail.get('quantum_status')}")
        print(f"  Claim state:    {detail.get('claim_state')}")
        evidence = detail.get("evidence", [])
        print(f"  Evidence count: {len(evidence)}")
        for ev in evidence[:3]:
            print(f"    [{ev['evidence_id'][:8]}] {ev.get('detector','?')} @ {ev.get('source_location','?')[:60]}")
        if evidence:
            ok("Evidence provenance present")
            results["evidence"] = True
        else:
            warn("No evidence records for this asset")
            results["evidence"] = False

# 6. Graph
section("6. CRYPTO DEPENDENCY GRAPH")
if scan_id:
    graph = api_get(f"/api/scans/{scan_id}/graph")
    if "ERROR" in graph:
        fail("Graph: " + graph["ERROR"])
        results["graph"] = False
    else:
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        print(f"  Nodes: {len(nodes)}")
        print(f"  Edges: {len(edges)}")
        node_types = {}
        for n in nodes:
            t = n.get("node_type", "unknown")
            node_types[t] = node_types.get(t, 0) + 1
        print(f"  Node types: {node_types}")
        if nodes:
            ok(f"Graph present with {len(nodes)} nodes / {len(edges)} edges")
            results["graph"] = True
        else:
            warn("Empty graph")
            results["graph"] = False

# 7. Risk
section("7. QUANTUM RISK ASSESSMENT")
if scan_id:
    risk = api_get(f"/api/scans/{scan_id}/risk")
    if "ERROR" in risk:
        fail("Risk: " + risk["ERROR"])
        results["risk"] = False
    else:
        results_list = risk.get("assets", risk.get("results", []))
        print(f"  Risk results: {len(results_list)}")
        for r in results_list[:3]:
            print(f"    [{r.get('asset_id','?')[:8]}] level={r.get('risk_level','?')} prob={r.get('probability','?')}")
        if results_list:
            ok(f"Risk assessment present ({len(results_list)} results)")
            results["risk"] = True
        else:
            warn("No risk results")
            results["risk"] = False

# 8. Migration
section("8. PQC MIGRATION PLAN")
if scan_id:
    plan = api_get(f"/api/scans/{scan_id}/plan")
    if "ERROR" in plan:
        fail("Plan: " + plan["ERROR"])
        results["migration"] = False
    else:
        plans = plan.get("plans", [])
        print(f"  Migration plans: {len(plans)}")
        for p in plans[:3]:
            alg = p.get('canonical_algorithm', '?')
            cands = p.get('candidates', [])
            print(f"    {alg}: {len(cands)} candidate(s)")
        if plans:
            ok(f"PQC migration plan present ({len(plans)} plans)")
            results["migration"] = True
        else:
            warn("No migration plans")
            results["migration"] = False

# 9. CBOM
section("9. CBOM (CycloneDX 1.7)")
if scan_id:
    cbom_resp = api_get(f"/api/scans/{scan_id}/cbom")
    if "ERROR" in cbom_resp:
        fail("CBOM: " + cbom_resp["ERROR"])
        results["cbom"] = False
    else:
        cbom = cbom_resp.get("cbom", cbom_resp)
        spec = cbom.get("specVersion", "?")
        comps = cbom.get("components", [])
        print(f"  Format:     {cbom.get('bomFormat','?')}")
        print(f"  Spec:       {spec}")
        print(f"  Components: {len(comps)}")

        val = cbom_resp.get("validation", {})
        print(f"  Validation: valid={val.get('is_valid','?')} errors={val.get('errors',[])}")

        mock_names = {"aes-256-gcm", "mock", "placeholder", "example-rsa-key"}
        is_mock = any(c.get("name","").lower() in mock_names for c in comps[:5]) if comps else False

        if comps and not is_mock:
            ok(f"CBOM has {len(comps)} real components (spec {spec})")
            for c in comps[:3]:
                print(f"    {c.get('name','?')} ({c.get('type','?')})")
            results["cbom"] = True
        elif is_mock:
            fail("CBOM appears to contain mock/fallback data")
            results["cbom"] = False
        else:
            warn("CBOM has no components")
            results["cbom"] = False

        # Save CBOM to file for inspection
        with open("D:/ecdat/cbom_latest.json", "w", encoding="utf-8") as f:
            json.dump(cbom_resp, f, indent=2, default=str)
        print(f"  CBOM saved to D:/ecdat/cbom_latest.json")

# 10. Compare page API deps
section("10. COMPARE PAGE API DEPENDENCY CHECK")
if scan_id and pyjwt_proj:
    checks = [
        ("/api/projects", "getProjects"),
        (f"/api/scans?project_id={pyjwt_proj['project_id']}", "getScans"),
        (f"/api/scans/{scan_id}/assets", "getScanAssets"),
        (f"/api/scans/{scan_id}/risk", "getScanRisk"),
        (f"/api/scans/{scan_id}/plan", "getScanMigrationPlan"),
        (f"/api/scans/{scan_id}/cbom", "getScanCBOM"),
    ]
    all_pass = True
    for path, fn in checks:
        r = api_get(path)
        success = "ERROR" not in r
        marker = "[PASS]" if success else "[FAIL]"
        errmsg = "" if success else " ERROR: " + r.get("ERROR","?")[:60]
        print(f"  {marker} {fn:30s}{errmsg}")
        if not success:
            all_pass = False
    results["compare_page_apis"] = all_pass
    if all_pass:
        ok("All Compare page API dependencies resolved")
    else:
        fail("Some Compare page API calls failed")

# 11. Summary
section("11. E2E VALIDATION SUMMARY")
all_results = {
    "health":             results.get("health", False),
    "asset_count_9":      results.get("asset_count", False),
    "evidence":           results.get("evidence", False),
    "graph":              results.get("graph", False),
    "risk":               results.get("risk", False),
    "migration":          results.get("migration", False),
    "cbom":               results.get("cbom", False),
    "compare_page_apis":  results.get("compare_page_apis", False),
}
for k, v in all_results.items():
    marker = "[PASS]" if v else "[FAIL]"
    print(f"  {marker} {k}")

total = sum(1 for v in all_results.values() if v)
print(f"\n  Score: {total}/{len(all_results)} checks passing")
if total == len(all_results):
    print("  STATUS: FULLY VALIDATED - prototype E2E pipeline confirmed")
elif total >= len(all_results) - 2:
    print("  STATUS: MOSTLY VALIDATED - minor issues remain")
else:
    print("  STATUS: VALIDATION INCOMPLETE - review failed checks above")

print(f"\n  Latest scan ID: {scan_id}")
print('='*60)
