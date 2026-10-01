"""
ECDAT Benchmark — Precision and Recall Evaluation on Hand-Labeled Real Corpus Findings.

Evaluates detector precision and recall against hand-labeled ground truth from:
  - PyJWT @ b5bd6fe (Python AST + Dependency)
  - JJWT @ fb71496 (Java Rule Engine + Manifests)

Ground truth includes:
  - True Positives (real crypto algorithm usages/implementations)
  - Negative Controls (string lookalikes, error messages, test keys, comments)
"""
from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from ecdat.scanners.python_ast import scan_python_file
from ecdat.scanners.java_rules import scan_java_file

REAL_CORPUS_DIR = SRC_DIR.parent / "real-corpus"

LABELED_CASES = [
    # --- PyJWT Positives ---
    {
        "id": "PYJWT-01",
        "repo": "PyJWT",
        "file": "jwt/algorithms.py",
        "expected_algo": "HMAC",
        "is_positive": True,
        "lang": "python",
        "description": "HMACAlgorithm class implementing HS256/384/512"
    },
    {
        "id": "PYJWT-02",
        "repo": "PyJWT",
        "file": "jwt/algorithms.py",
        "expected_algo": "RSA",
        "is_positive": True,
        "lang": "python",
        "description": "RSAAlgorithm class implementing RS256/384/512"
    },
    {
        "id": "PYJWT-03",
        "repo": "PyJWT",
        "file": "jwt/algorithms.py",
        "expected_algo": "RSA-PSS",
        "is_positive": True,
        "lang": "python",
        "description": "RSAPSSAlgorithm class implementing PS256/384/512"
    },
    {
        "id": "PYJWT-04",
        "repo": "PyJWT",
        "file": "jwt/algorithms.py",
        "expected_algo": "ECDSA",
        "is_positive": True,
        "lang": "python",
        "description": "ECAlgorithm class implementing ES256/384/512"
    },
    {
        "id": "PYJWT-05",
        "repo": "PyJWT",
        "file": "jwt/algorithms.py",
        "expected_algo": "Ed25519",
        "is_positive": True,
        "lang": "python",
        "description": "OKPAlgorithm class implementing Ed25519"
    },

    # --- PyJWT Negative Controls ---
    {
        "id": "PYJWT-NEG-01",
        "repo": "PyJWT",
        "file": "jwt/exceptions.py",
        "expected_algo": None,
        "is_positive": False,
        "lang": "python",
        "description": "InvalidAlgorithmError exception string — must NOT claim crypto algorithm"
    },
    {
        "id": "PYJWT-NEG-02",
        "repo": "PyJWT",
        "file": "jwt/warnings.py",
        "expected_algo": None,
        "is_positive": False,
        "lang": "python",
        "description": "Deprecation warnings — must NOT trigger crypto detectors"
    },

    # --- JJWT Positives ---
    {
        "id": "JJWT-01",
        "repo": "jjwt",
        "file": "impl/src/main/java/io/jsonwebtoken/impl/security/RsaSignatureAlgorithm.java",
        "expected_algo": "RSA",
        "is_positive": True,
        "lang": "java",
        "description": "RsaSignatureAlgorithm implements SHA256withRSA, SHA384withRSA, SHA512withRSA"
    },
    {
        "id": "JJWT-02",
        "repo": "jjwt",
        "file": "impl/src/main/java/io/jsonwebtoken/impl/security/EcSignatureAlgorithm.java",
        "expected_algo": "ECDSA",
        "is_positive": True,
        "lang": "java",
        "description": "EcSignatureAlgorithm implements SHA256withECDSA on P-256, P-384, P-521"
    },
    {
        "id": "JJWT-03",
        "repo": "jjwt",
        "file": "impl/src/main/java/io/jsonwebtoken/impl/security/DefaultMacAlgorithm.java",
        "expected_algo": "HMAC",
        "is_positive": True,
        "lang": "java",
        "description": "DefaultMacAlgorithm implements HmacSHA256, HmacSHA384, HmacSHA512"
    },
    {
        "id": "JJWT-04",
        "repo": "jjwt",
        "file": "impl/src/main/java/io/jsonwebtoken/impl/security/DefaultRsaKeyAlgorithm.java",
        "expected_algo": "RSA-OAEP",
        "is_positive": True,
        "lang": "java",
        "description": "DefaultRsaKeyAlgorithm implements RSA-OAEP and RSA-OAEP-256 key wrap"
    },
    {
        "id": "JJWT-05",
        "repo": "jjwt",
        "file": "impl/src/main/java/io/jsonwebtoken/impl/security/AesAlgorithm.java",
        "expected_algo": "AES",
        "is_positive": True,
        "lang": "java",
        "description": "AesAlgorithm implements AES key encryption"
    },
    {
        "id": "JJWT-06",
        "repo": "jjwt",
        "file": "impl/src/main/java/io/jsonwebtoken/impl/security/EdSignatureAlgorithm.java",
        "expected_algo": "Ed25519",
        "is_positive": True,
        "lang": "java",
        "description": "EdSignatureAlgorithm implements EdDSA (Ed25519 / Ed448)"
    },

    # --- JJWT Negative Controls ---
    {
        "id": "JJWT-NEG-01",
        "repo": "jjwt",
        "file": "api/src/main/java/io/jsonwebtoken/UnsupportedJwtException.java",
        "expected_algo": None,
        "is_positive": False,
        "lang": "java",
        "description": "Exception class containing error strings — must NOT fire as crypto finding"
    },
    {
        "id": "JJWT-NEG-02",
        "repo": "jjwt",
        "file": "api/src/main/java/io/jsonwebtoken/MalformedJwtException.java",
        "expected_algo": None,
        "is_positive": False,
        "lang": "java",
        "description": "MalformedJwtException class — must NOT detect crypto algorithms"
    },
    {
        "id": "JJWT-NEG-03",
        "repo": "jjwt",
        "file": "api/src/main/java/io/jsonwebtoken/ExpiredJwtException.java",
        "expected_algo": None,
        "is_positive": False,
        "lang": "java",
        "description": "ExpiredJwtException class — must NOT detect crypto algorithms"
    },
]


def run_benchmark():
    print("=" * 75)
    print("ECDAT CRYPTOGRAPHIC SCANNER ACCURACY BENCHMARK")
    print("Evaluating Ground Truth Against Pinned Real Corpora:")
    print("  - PyJWT @ b5bd6fe")
    print("  - JJWT @ fb71496")
    print("=" * 75)

    tp, fp, tn, fn = 0, 0, 0, 0
    results = []

    for case in LABELED_CASES:
        repo_path = REAL_CORPUS_DIR / case["repo"]
        file_path = repo_path / case["file"]

        if not file_path.exists():
            print(f"[ERROR] File not found: {file_path}")
            continue

        content = file_path.read_text(encoding="utf-8", errors="replace")
        findings = []

        if case["lang"] == "python":
            findings = scan_python_file(case["file"], content)
        elif case["lang"] == "java":
            findings = scan_java_file(case["file"], content)

        detected_algos = set()
        for f in findings:
            algo = getattr(f, "algorithm_hint", "")
            if not algo and hasattr(f, "algorithm_hints") and f.algorithm_hints:
                algo = f.algorithm_hints[0]
            if algo and algo.upper() != "UNKNOWN":
                detected_algos.add(algo.upper())

        is_positive = case["is_positive"]
        expected_algo = case["expected_algo"].upper() if case["expected_algo"] else None

        if is_positive:
            # Check if expected algorithm was detected
            matched = any(expected_algo in da or da in expected_algo for da in detected_algos)
            if matched:
                tp += 1
                outcome = "TP (True Positive)"
            else:
                fn += 1
                outcome = "FN (False Negative)"
        else:
            # Negative control: should NOT detect implementations/usages
            if len(detected_algos) == 0:
                tn += 1
                outcome = "TN (True Negative)"
            else:
                fp += 1
                outcome = f"FP (Spurious: {', '.join(detected_algos)})"

        results.append({
            "id": case["id"],
            "repo": case["repo"],
            "file": case["file"].split("/")[-1],
            "expected": expected_algo or "[CLEAN/NONE]",
            "detected": list(detected_algos),
            "outcome": outcome,
        })

    # Summary metrics
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0.0

    print(f"\n{'ID':<15} {'Repo':<10} {'File':<28} {'Expected':<14} {'Outcome':<20}")
    print("-" * 90)
    for r in results:
        print(f"{r['id']:<15} {r['repo']:<10} {r['file']:<28} {r['expected']:<14} {r['outcome']:<20}")

    print("\n" + "=" * 75)
    print("DETECTOR PERFORMANCE METRICS (Real-World Hand-Labeled Benchmark):")
    print(f"  Total Evaluated Cases : {len(results)}")
    print(f"  True Positives  (TP)  : {tp}")
    print(f"  True Negatives  (TN)  : {tn}")
    print(f"  False Positives (FP)  : {fp}")
    print(f"  False Negatives (FN)  : {fn}")
    print("-" * 50)
    print(f"  PRECISION             : {precision * 100:.2f}%")
    print(f"  RECALL                : {recall * 100:.2f}%")
    print(f"  F1-SCORE              : {f1 * 100:.2f}%")
    print(f"  OVERALL ACCURACY      : {accuracy * 100:.2f}%")
    print("=" * 75)

    return {
        "tp": tp, "tn": tn, "fp": fp, "fn": fn,
        "precision": precision, "recall": recall, "f1": f1, "accuracy": accuracy
    }


if __name__ == "__main__":
    run_benchmark()
