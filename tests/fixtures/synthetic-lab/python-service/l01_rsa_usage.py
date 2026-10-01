"""
Enterprise Lab — L01: Python Direct RSA Usage
Expected evidence roles: IMPLEMENTATION, USAGE
Algorithm: RSA
"""
import rsa

def sign_payload(payload: bytes, private_key: rsa.PrivateKey) -> bytes:
    """Sign a payload with RSA using SHA-256."""
    signature = rsa.sign(payload, private_key, 'SHA-256')
    return signature

def verify_payload(payload: bytes, signature: bytes, public_key: rsa.PublicKey) -> bool:
    """Verify an RSA signature."""
    try:
        rsa.verify(payload, signature, public_key)
        return True
    except rsa.VerificationError:
        return False

def generate_keys():
    (pub_key, priv_key) = rsa.newkeys(2048)
    return pub_key, priv_key
