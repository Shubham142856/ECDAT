import urllib.request
import json
import time

base = 'http://127.0.0.1:8000'

# 1. Create project
req = urllib.request.Request(f'{base}/api/projects', data=json.dumps({
    'name': 'crypto-service-demo',
    'description': 'Real-world cryptographic microservice with RSA, AES, SHA-256'
}).encode(), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as r:
    proj = json.loads(r.read())
proj_id = proj['project_id']
print('Created Project:', proj['name'], proj_id)

# 2. Upload crypto artifact
crypto_code = b"""
import hashlib
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def auth_service(payload: bytes):
    priv_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    digest = hashlib.sha256(payload).hexdigest()
    digest512 = hashlib.sha512(payload).hexdigest()
    key = b"0123456789abcdef0123456789abcdef"
    iv = b"0123456789abcdef"
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    return priv_key, digest, digest512, cipher
"""

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="auth_crypto.py"\r\n'
    f'Content-Type: text/x-python\r\n\r\n'
).encode() + crypto_code + f'\r\n--{boundary}--\r\n'.encode()

req2 = urllib.request.Request(
    f'{base}/api/projects/{proj_id}/artifacts?artifact_type=python_source',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
with urllib.request.urlopen(req2) as r:
    artifact = json.loads(r.read())
print('Uploaded Artifact:', artifact['original_name'], artifact['artifact_id'])

# 3. Trigger Scan
req3 = urllib.request.Request(f'{base}/api/scans', data=json.dumps({
    'project_id': proj_id,
    'mode': 'live'
}).encode(), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req3) as r:
    scan = json.loads(r.read())
scan_id = scan['scan_id']
print('Triggered Scan:', scan_id, 'State:', scan['state'])

# 4. Poll scan to completion
for i in range(30):
    time.sleep(1)
    with urllib.request.urlopen(f'{base}/api/scans/{scan_id}') as r:
        s = json.loads(r.read())
        print(f'  [{i+1}s] Scan state: {s["state"]}')
        if s['state'] in ('completed', 'failed'):
            break

# 5. Check discovered assets
with urllib.request.urlopen(f'{base}/api/scans/{scan_id}/assets') as r:
    assets_data = json.loads(r.read())
    items = assets_data.get('items', [])
    print(f'\nTotal Discovered Assets: {len(items)}')
    for item in items:
        print(f'  - {item["canonical_algorithm"]} ({item["family"]}) | Status: {item["quantum_status"]} | Role: {item["usage_role"]}')
