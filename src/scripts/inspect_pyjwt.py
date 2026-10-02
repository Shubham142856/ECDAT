import sqlite3
from pathlib import Path

conn = sqlite3.connect("D:/ecdat/ecdat.db")
c = conn.cursor()

arts = c.execute(
    "SELECT artifact_id, project_id, original_name, stored_path, artifact_type FROM artifacts WHERE project_id = '5290423c-0fa3-4646-ae30-ce41a845a693'"
).fetchall()

print("Artifacts for PyJWT:")
for a in arts:
    print(" ", a)
    p = Path(a[3])
    if p.exists():
        print("    file size:", p.stat().st_size)
        text = p.read_text(encoding="utf-8", errors="replace")[:200]
        print("    content preview:", repr(text))

print("\nAssets for latest PyJWT scan in DB:")
assets = c.execute(
    "SELECT asset_id, canonical_algorithm, quantum_status FROM crypto_assets WHERE scan_id = (SELECT scan_id FROM scans WHERE project_id = '5290423c-0fa3-4646-ae30-ce41a845a693' ORDER BY created_at DESC LIMIT 1)"
).fetchall()
print(f"Total: {len(assets)}")
for a in assets:
    print(" ", a)
