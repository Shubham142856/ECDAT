"""
ECDAT Four-Corpus Clean Rescan Runner (Post-Consolidated Category-A Patch)

Executes clean scans across all four pinned repositories:
  1. PyJWT @ b5bd6fe (jwt/ + dependencies, matching Step 3B baseline scope)
  2. Certbot @ 4856493 (full repo, matching Step 3C baseline scope)
  3. Paramiko @ 142f593 (full repo, matching Step 3D baseline scope)
  4. JJWT @ fb71496 (full repo, matching Step 3E baseline scope)

Saves artifacts in D:\\ecdat\\reports\\rescan_<repo_name>\\ and outputs
a quantitative Before/After comparison.
"""
import sys, os, json, dataclasses
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter

sys.path.insert(0, r"D:\ecdat\src")

from ecdat.scanners.python_ast import scan_python_directory, scan_python_file
from ecdat.scanners.java_rules import scan_java_file
from ecdat.scanners.dependency import scan_dependency_file, scan_dependency_directory
from ecdat.scanners.certificate import scan_certificate_directory
from ecdat.scanners.config_scan import scan_config_directory
from ecdat.scanners.binary import scan_binary_directory
from ecdat.scanners.container import scan_container_directory
from ecdat.fusion import fuse_evidence
from ecdat.ontology import EvidenceRole, SourceType

CORPORA = [
    {
        "name": "pyjwt",
        "display": "PyJWT @ b5bd6fe",
        "root": Path(r"D:\ecdat\real-corpus\PyJWT"),
        "lang": "python",
        "scope": "production_package",  # jwt/ + root dependencies
    },
    {
        "name": "certbot",
        "display": "Certbot @ 4856493",
        "root": Path(r"D:\ecdat\real-corpus\certbot"),
        "lang": "python",
        "scope": "full_repo",
    },
    {
        "name": "paramiko",
        "display": "Paramiko @ 142f593",
        "root": Path(r"D:\ecdat\real-corpus\paramiko"),
        "lang": "python",
        "scope": "full_repo",
    },
    {
        "name": "jjwt",
        "display": "JJWT @ fb71496",
        "root": Path(r"D:\ecdat\real-corpus\jjwt"),
        "lang": "java",
        "scope": "full_repo",
    },
]

def finding_to_dict(f) -> dict:
    if dataclasses.is_dataclass(f):
        d = dataclasses.asdict(f)
    elif hasattr(f, "__dict__"):
        d = f.__dict__.copy()
    else:
        d = {
            "file_path": getattr(f, "file_path", ""),
            "line": getattr(f, "line", 0),
            "col": getattr(f, "col", 0),
            "detector": getattr(f, "detector", ""),
            "raw_signal": getattr(f, "raw_signal", ""),
            "roles": getattr(f, "roles", []),
            "algorithm_hint": getattr(f, "algorithm_hint", ""),
            "confidence": getattr(f, "confidence", 0.0),
            "provenance": getattr(f, "provenance", {}),
            "source_type": getattr(f, "source_type", ""),
        }
    if "roles" in d and isinstance(d["roles"], list):
        d["roles"] = [r.value if hasattr(r, "value") else str(r) for r in d["roles"]]
    if "source_type" in d and hasattr(d["source_type"], "value"):
        d["source_type"] = d["source_type"].value
    return d

def run_rescan():
    results = {}
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")

    for corpus in CORPORA:
        name = corpus["name"]
        display = corpus["display"]
        root = corpus["root"]
        lang = corpus["lang"]
        scope = corpus["scope"]

        print(f"\n{'='*70}")
        print(f"RESCANNING: {display}")
        print(f"Root: {root} | Scope: {scope}")
        print(f"{'='*70}")

        out_dir = Path(r"D:\ecdat\reports") / f"rescan_{name}"
        out_dir.mkdir(parents=True, exist_ok=True)
        scan_id = f"rescan_{name}_{timestamp}"

        all_raw = []

        # 1. Source code scan
        if lang == "python":
            if scope == "production_package":
                src_dir = root / "jwt"
                py_findings = list(scan_python_directory(str(src_dir)))
                all_raw.extend(py_findings)
                print(f"  [Python AST] Scanned {src_dir}: {len(py_findings)} raw findings")
            else:
                py_files = sorted(list(root.rglob("*.py")))
                count = 0
                for pf in py_files:
                    if pf.is_file():
                        try:
                            txt = pf.read_text(encoding="utf-8", errors="replace")
                            rel = str(pf.relative_to(root))
                            findings = scan_python_file(rel, txt)
                            all_raw.extend(findings)
                            count += len(findings)
                        except Exception as e:
                            print(f"    Error reading {pf}: {e}")
                print(f"  [Python AST] Scanned {len(py_files)} files: {count} raw findings")

        elif lang == "java":
            java_files = sorted(list(root.rglob("*.java")))
            count = 0
            for jf in java_files:
                if jf.is_file():
                    try:
                        txt = jf.read_text(encoding="utf-8", errors="replace")
                        rel = str(jf.relative_to(root))
                        findings = scan_java_file(rel, txt)
                        all_raw.extend(findings)
                        count += len(findings)
                    except Exception as e:
                        print(f"    Error reading {jf}: {e}")
            print(f"  [Java Rules] Scanned {len(java_files)} files: {count} raw findings")

        # 2. Dependency manifests
        if scope == "production_package":
            dep_findings = []
            for dep_file in ["pyproject.toml", "requirements.txt"]:
                dep_path = root / dep_file
                if dep_path.exists():
                    txt = dep_path.read_text(encoding="utf-8", errors="replace")
                    dep_findings.extend(scan_dependency_file(dep_file, txt))
        else:
            dep_findings = list(scan_dependency_directory(str(root)))

        dep_count = 0
        for df in dep_findings:
            if df.algorithm_hints:
                for algo in df.algorithm_hints:
                    all_raw.append(type("_F", (), {
                        "file_path": df.file_path, "line": df.line, "col": 0,
                        "detector": df.detector, "raw_signal": df.raw_signal,
                        "roles": df.roles, "algorithm_hint": algo,
                        "confidence": df.confidence, "provenance": df.provenance,
                        "source_type": df.source_type,
                    })())
                    dep_count += 1
            else:
                all_raw.append(type("_F", (), {
                    "file_path": df.file_path, "line": df.line, "col": 0,
                    "detector": df.detector, "raw_signal": df.raw_signal,
                    "roles": df.roles, "algorithm_hint": df.package_name,
                    "confidence": df.confidence, "provenance": df.provenance,
                    "source_type": df.source_type,
                })())
                dep_count += 1
        print(f"  [Dependencies] Findings emitted: {dep_count}")

        # 3. Certificate Scan (only if not restricted to production package)
        cert_count = 0
        if scope != "production_package":
            for c_list, p_list in scan_certificate_directory(str(root)):
                all_raw.extend(c_list)
                cert_count += len(c_list)
            print(f"  [Certificates] X.509 cert findings: {cert_count}")

        # 4. Config Scan
        cfg_count = 0
        if scope != "production_package":
            cfg_findings = list(scan_config_directory(str(root)))
            all_raw.extend(cfg_findings)
            cfg_count = len(cfg_findings)
            print(f"  [Configs] Findings emitted: {cfg_count}")

        # 5. Binary Scan
        bin_count = 0
        if scope != "production_package":
            bin_findings = list(scan_binary_directory(str(root)))
            all_raw.extend(bin_findings)
            bin_count = len(bin_findings)
            print(f"  [Binaries] Findings emitted: {bin_count}")

        # 6. Container Scan
        cnt_findings_count = 0
        if scope != "production_package":
            for c_res in scan_container_directory(str(root)):
                c_f, cert_f, pk_f, b_f = c_res
                all_raw.extend(c_f)
                all_raw.extend(cert_f)
                all_raw.extend(b_f)
                cnt_findings_count += len(c_f) + len(cert_f) + len(b_f)
            print(f"  [Containers] Findings emitted: {cnt_findings_count}")

        print(f"  --> TOTAL RAW FINDINGS: {len(all_raw)}")

        # Breakdown by detector
        det_counter = Counter(f.detector for f in all_raw)

        # Breakdown by role
        role_counter = Counter()
        for f in all_raw:
            for r in getattr(f, "roles", []):
                val = r.value if hasattr(r, "value") else str(r)
                role_counter[val] += 1

        # 7. Fusion
        obs_time = datetime.now(timezone.utc).isoformat()
        fused_assets = fuse_evidence(scan_id, all_raw, obs_time)
        print(f"  --> FUSED ASSETS: {len(fused_assets)}")

        canonical_algos = sorted(list({a.canonical_algorithm for a in fused_assets}))
        unknown_assets = [a for a in fused_assets if a.family.value == "unknown"]

        print(f"  --> UNKNOWN / SPURIOUS ASSETS: {len(unknown_assets)}")
        print(f"  --> CANONICAL ALGORITHMS ({len(canonical_algos)}): {', '.join(canonical_algos)}")

        results[name] = {
            "display": display,
            "raw_findings": len(all_raw),
            "raw_by_detector": dict(det_counter),
            "raw_by_role": dict(role_counter),
            "fused_assets_count": len(fused_assets),
            "unknown_assets_count": len(unknown_assets),
            "canonical_algorithms": canonical_algos,
            "fused_assets": fused_assets,
        }

        # Save artifacts
        with open(out_dir / "01_raw_findings.json", "w", encoding="utf-8") as fp:
            json.dump([finding_to_dict(f) for f in all_raw], fp, indent=2)

        fused_serializable = []
        for fa in fused_assets:
            fused_serializable.append({
                "asset_id": fa.asset_id,
                "canonical_algorithm": fa.canonical_algorithm,
                "family": fa.family.value,
                "quantum_status": fa.quantum_status.value,
                "claim_state": fa.claim_state.value,
                "confidence": fa.confidence,
                "roles": [r.value for r in fa.roles],
                "evidence_count": len(fa.evidence_records),
            })
        with open(out_dir / "02_fused_assets.json", "w", encoding="utf-8") as fp:
            json.dump(fused_serializable, fp, indent=2)

        summary_data = {
            "corpus": display,
            "scan_id": scan_id,
            "timestamp": obs_time,
            "raw_findings_total": len(all_raw),
            "detectors": dict(det_counter),
            "roles": dict(role_counter),
            "fused_assets_total": len(fused_assets),
            "unknown_assets_total": len(unknown_assets),
            "canonical_algorithms": canonical_algos,
        }
        with open(out_dir / "03_summary.json", "w", encoding="utf-8") as fp:
            json.dump(summary_data, fp, indent=2)

    # Print summary comparative table
    print("\n" + "=" * 90)
    print("CONSOLIDATED BEFORE / AFTER RESCAN RESULTS")
    print("=" * 90)
    
    baseline_stats = {
        "pyjwt": {"raw": 92, "fused": 8, "unknown": 0, "canonical": ["ECDSA", "Ed25519", "HMAC", "RSA", "RSA-PSS", "SHA-256", "SHA-384", "SHA-512"]},
        "certbot": {"raw": 289, "fused": 13, "unknown": 0, "canonical": ["3DES", "AES", "ChaCha20", "ECDSA", "Ed25519", "Ed448", "HMAC", "MD5", "RSA", "SHA-1", "SHA-256", "SHA-384", "SHA-512"]},
        "paramiko": {"raw": 388, "fused": 17, "unknown": 0, "canonical": ["3DES", "ARC4", "AES", "Blowfish", "Camellia", "ChaCha20", "Curve25519", "Diffie-Hellman", "DSA", "ECDH", "ECDSA", "Ed25519", "MD5", "RSA", "SHA-1", "SHA-256", "SHA-512"]},
        "jjwt": {"raw": 490, "fused": 72, "unknown": 68, "canonical": ["ECDSA", "Ed25519", "HMAC", "RSA"]},
    }

    print(f"{'Repository':<12} | {'Raw (Pre)':<10} | {'Raw (Post)':<10} | {'Fused (Pre)':<12} | {'Fused (Post)':<12} | {'Spurious UNKNOWN (Pre -> Post)':<30}")
    print("-" * 95)
    for c in CORPORA:
        k = c["name"]
        b = baseline_stats[k]
        r = results[k]
        print(f"{k.upper():<12} | {b['raw']:<10} | {r['raw_findings']:<10} | {b['fused']:<12} | {r['fused_assets_count']:<12} | {b['unknown']:>2} -> {r['unknown_assets_count']:<2}")

    return results

if __name__ == "__main__":
    run_rescan()
