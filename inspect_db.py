"""Quick DB inspection script for ECDAT E2E validation."""
import sqlite3
import json

conn = sqlite3.connect('D:/ecdat/ecdat.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=" * 60)
print("ECDAT DATABASE STATE INSPECTION")
print("=" * 60)

# Table counts
tables = ['projects', 'artifacts', 'scans', 'crypto_assets', 'evidence', 
          'graph_nodes', 'graph_edges', 'risk_results', 'migration_plans']
for t in tables:
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{t}"')
        count = cur.fetchone()[0]
        print(f"  {t:25s}: {count} rows")
    except Exception as e:
        print(f"  {t:25s}: ERROR - {e}")

print()
print("PROJECTS:")
cur.execute("SELECT project_id, name, created_at FROM projects ORDER BY created_at DESC LIMIT 10")
for row in cur.fetchall():
    print(f"  [{row['project_id'][:8]}] {row['name']}")

print()
print("SCANS (last 10):")
cur.execute("SELECT scan_id, project_id, state, mode, created_at, error_message FROM scans ORDER BY created_at DESC LIMIT 10")
scans = cur.fetchall()
for row in scans:
    print(f"  [{row['scan_id'][:8]}] state={row['state']} mode={row['mode']} proj={row['project_id'][:8]} err={row['error_message']}")

print()
print("CRYPTO ASSETS (by scan):")
cur.execute("""
    SELECT scan_id, COUNT(*) as cnt, GROUP_CONCAT(canonical_algorithm, ', ') as algos
    FROM crypto_assets 
    GROUP BY scan_id
    ORDER BY cnt DESC
    LIMIT 10
""")
for row in cur.fetchall():
    print(f"  scan={row['scan_id'][:8]} count={row['cnt']} algos={row['algos'][:100]}")

print()
print("LATEST SCAN ASSETS:")
cur.execute("SELECT scan_id FROM scans WHERE state='completed' ORDER BY created_at DESC LIMIT 1")
row = cur.fetchone()
if row:
    latest_scan = row['scan_id']
    print(f"  Latest completed scan: {latest_scan}")
    cur.execute("SELECT asset_id, canonical_algorithm, family, quantum_status, claim_state, confidence FROM crypto_assets WHERE scan_id=?", (latest_scan,))
    for a in cur.fetchall():
        print(f"    [{a['asset_id'][:8]}] {a['canonical_algorithm']} ({a['family']}) q={a['quantum_status']} c={a['claim_state']} conf={a['confidence']:.2f}")
    
    cur.execute("SELECT COUNT(*) FROM evidence WHERE scan_id=?", (latest_scan,))
    print(f"  Evidence records: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM graph_nodes WHERE scan_id=?", (latest_scan,))
    print(f"  Graph nodes: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM risk_results WHERE scan_id=?", (latest_scan,))
    print(f"  Risk results: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM migration_plans WHERE scan_id=?", (latest_scan,))
    print(f"  Migration plans: {cur.fetchone()[0]}")
else:
    print("  No completed scans found")

print()
print("STALE QUEUED SCANS:")
cur.execute("SELECT scan_id, created_at FROM scans WHERE state='queued'")
for row in cur.fetchall():
    print(f"  [{row['scan_id'][:8]}] created={row['created_at']}")

conn.close()
print("=" * 60)
