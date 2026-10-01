"""
Enterprise Lab — L02: Python import alias
Expected evidence roles: IMPLEMENTATION, USAGE
Algorithm: AES
"""
from Crypto.Cipher import AES as crypto_aes
from Crypto.Random import get_random_bytes

def encrypt_data(data: bytes, key: bytes) -> tuple:
    """Encrypt data with AES-256 using import alias."""
    cipher = crypto_aes.new(key, crypto_aes.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data)
    return ciphertext, tag, cipher.nonce

def decrypt_data(ciphertext: bytes, key: bytes, nonce: bytes, tag: bytes) -> bytes:
    """Decrypt AES-256-GCM encrypted data."""
    cipher = crypto_aes.new(key, crypto_aes.MODE_GCM, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)
