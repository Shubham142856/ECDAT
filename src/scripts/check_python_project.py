import sqlite3

conn = sqlite3.connect('D:/ecdat/ecdat.db')
c = conn.cursor()

print('=== Projects ===')
for r in c.execute('SELECT project_id, name FROM projects'):
    print(r)

print('\n=== Artifacts for python ===')
for r in c.execute("SELECT artifact_id, project_id, original_name, stored_path, artifact_type, size_bytes FROM artifacts WHERE project_id='8feae55b-8b90-4c77-ab42-df44bd5923cd'"):
    print(r)

print('\n=== Scans for python ===')
for r in c.execute("SELECT scan_id, project_id, state, created_at, error_message FROM scans WHERE project_id='8feae55b-8b90-4c77-ab42-df44bd5923cd'"):
    print(r)

print('\n=== Assets for scan c24f0b56-f4d9-44b6-9f90-9ac683976c70 ===')
for r in c.execute("SELECT asset_id, scan_id, canonical_algorithm FROM crypto_assets WHERE scan_id='c24f0b56-f4d9-44b6-9f90-9ac683976c70'"):
    print(r)

print('\n=== Evidence for scan c24f0b56-f4d9-44b6-9f90-9ac683976c70 ===')
for r in c.execute("SELECT evidence_id, scan_id, raw_signal, detector FROM evidence WHERE scan_id='c24f0b56-f4d9-44b6-9f90-9ac683976c70'"):
    print(r)
