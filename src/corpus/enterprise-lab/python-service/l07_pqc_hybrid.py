"""
Enterprise Lab — L07: PQC Hybrid Usage
Expected evidence roles: IMPLEMENTATION, USAGE
Algorithm: ML-KEM, X25519 (hybrid)
"""
try:
    import oqs
    _OQS_AVAILABLE = True
except ImportError:
    _OQS_AVAILABLE = False

from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey


def hybrid_key_exchange():
    """Perform X25519 + ML-KEM-768 hybrid key exchange."""
    # Classical component: X25519
    x25519_private = X25519PrivateKey.generate()
    x25519_public = x25519_private.public_key()

    if _OQS_AVAILABLE:
        # PQC component: ML-KEM-768 (NIST FIPS 203)
        kem = oqs.KeyEncapsulation("ML-KEM-768")
        public_key_pqc = kem.generate_keypair()
        ciphertext_pqc, shared_secret_pqc = kem.encap_secret(public_key_pqc)
        return shared_secret_pqc
    return None
