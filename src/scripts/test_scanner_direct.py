import sys
sys.path.insert(0, 'D:/ecdat/src')
from ecdat.scanners.python_ast import scan_python_file

code = """
import hashlib
from cryptography.hazmat.primitives.asymmetric import rsa

def sign_data():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    h = hashlib.sha256(b"hello").hexdigest()
    return h
"""

findings = scan_python_file('test_crypto.py', code)
print(f'Findings: {len(findings)}')
for f in findings:
    print(f.algorithm_hint, f.source_location, f.roles)
