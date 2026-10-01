"""
Enterprise Lab — L08: Contradictory Evidence
Expected: CONTRADICTORY claim state
Config says AES-128, code calls AES-256.
"""
from Crypto.Cipher import AES


def encrypt_with_key(data: bytes, key: bytes) -> bytes:
    """This code uses AES-256 (key=32 bytes), but config says AES-128."""
    # key should be 32 bytes for AES-256
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data)
    return ciphertext
