"""
ECDAT Unit Tests — Consolidated Category-A Patch Verification

Tests the cross-corpus fixes:
  1. Java generic class import capability classification
  2. Java algorithm-specific interface implementation detection
  3. Java engine instantiation normalization
  4. Fusion Rule A & B exclusion of generic Java classes from spurious asset creation
  5. Maven POM property interpolation
  6. Python AST sequence (tuple/list/set) preference traversal
  7. Cross-corpus algorithm normalization (CTR, CBC, 3DES, PQC, Ed448/X448)
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from datetime import datetime, timezone
from ecdat.scanners.java_rules import scan_java_file
from ecdat.scanners.dependency import scan_pom_xml
from ecdat.scanners.python_ast import scan_python_file
from ecdat.fusion import fuse_evidence
from ecdat.knowledge import normalize_algorithm
from ecdat.ontology import EvidenceRole, SourceType, QuantumStatus, AlgorithmFamily

NOW = datetime.now(timezone.utc).isoformat()


class TestJavaRulesScanner:
    def test_generic_java_imports_produce_capability(self):
        source = """
        package com.example;
        import javax.crypto.Cipher;
        import java.security.Key;
        import java.security.SecretKey;
        import java.security.SecureRandom;
        import java.security.cert.X509Certificate;
        """
        findings = scan_java_file("Test.java", source)
        assert len(findings) == 5
        for f in findings:
            assert f.roles == [EvidenceRole.CAPABILITY]
            assert f.confidence == 0.50

    def test_specific_java_imports_produce_implementation(self):
        source = """
        package com.example;
        import java.security.interfaces.RSAPublicKey;
        import java.security.interfaces.RSAPrivateKey;
        import java.security.spec.ECParameterSpec;
        import java.security.interfaces.EdECPublicKey;
        """
        findings = scan_java_file("TestCrypto.java", source)
        assert len(findings) == 4
        hints = {f.algorithm_hint for f in findings}
        assert "RSA" in hints
        assert "ECDSA" in hints
        assert "Ed25519" in hints
        for f in findings:
            assert f.roles == [EvidenceRole.IMPLEMENTATION]
            assert f.confidence == 0.60

    def test_engine_instantiations_normalized(self):
        source = """
        package com.example;
        public class MyEngine {
            public void init() {
                var sig = new RsaSignatureAlgorithm();
                var kw = new AesWrapKeyAlgorithm(256);
            }
        }
        """
        findings = scan_java_file("MyEngine.java", source)
        engine_findings = [f for f in findings if f.detector == "java.rule.engine_instantiation"]
        assert len(engine_findings) == 2
        hints = [f.algorithm_hint for f in engine_findings]
        assert "RSA" in hints
        assert "AES" in hints


class TestFusionJavaFiltering:
    def test_generic_java_classes_do_not_produce_spurious_assets(self):
        source = """
        package com.example;
        import javax.crypto.Cipher;
        import java.security.Key;
        import java.security.SecretKey;
        import java.security.SecureRandom;
        import java.security.Provider;
        import java.security.interfaces.RSAPublicKey;
        """
        raw_findings = scan_java_file("Test.java", source)
        assets = fuse_evidence("scan-test-java", raw_findings, NOW)
        
        # Only RSAPublicKey should form an asset (RSA)
        assert len(assets) == 1
        assert assets[0].canonical_algorithm == "RSA"
        assert assets[0].family == AlgorithmFamily.ASYMMETRIC_CIPHER

        # Verify that generic classes (Cipher, Key, SecretKey, SecureRandom, Provider) are NOT assets
        asset_algos = {a.canonical_algorithm for a in assets}
        assert "Cipher" not in asset_algos
        assert "Key" not in asset_algos
        assert "SecretKey" not in asset_algos
        assert "SecureRandom" not in asset_algos
        assert "Provider" not in asset_algos


class TestMavenPropertyInterpolation:
    def test_pom_xml_property_resolution(self):
        pom_text = """<project>
            <properties>
                <bouncycastle.version>1.84</bouncycastle.version>
                <bcprov.artifactId>bcprov-jdk18on</bcprov.artifactId>
            </properties>
            <dependencies>
                <dependency>
                    <groupId>org.bouncycastle</groupId>
                    <artifactId>${bcprov.artifactId}</artifactId>
                    <version>${bouncycastle.version}</version>
                </dependency>
            </dependencies>
        </project>"""
        findings = scan_pom_xml("pom.xml", pom_text)
        assert len(findings) == 1
        f = findings[0]
        assert f.package_name == "bcprov-jdk18on"
        assert f.version == "1.84"
        assert f.roles == [EvidenceRole.CAPABILITY]
        assert "RSA" in f.algorithm_hints
        assert "ML-KEM" in f.algorithm_hints


class TestPythonAstSequencesAndCiphers:
    def test_tuple_assignment_preference_lists(self):
        py_code = (
            "_preferred_ciphers = (\n"
            "    'aes128-ctr',\n"
            "    'aes256-ctr',\n"
            "    '3des-cbc',\n"
            ")\n"
            "_preferred_kex = (\n"
            "    'curve25519-sha256',\n"
            "    'ecdh-sha2-nistp256',\n"
            ")\n"
        )
        findings = scan_python_file("transport.py", py_code)
        hints = {f.algorithm_hint.lower() for f in findings if f.detector == "python.ast.assignment"}
        assert "aes128-ctr" in hints
        assert "aes256-ctr" in hints
        assert "3des-cbc" in hints
        assert "curve25519" in hints or "curve25519-sha256" in hints


class TestAlgorithmAliasesNormalization:
    def test_aes_cbc_and_ctr_normalization(self):
        for name in ("aes128-cbc", "aes256-cbc", "aes128-ctr", "aes256-ctr"):
            meta = normalize_algorithm(name)
            assert meta["canonical"] == "AES"
            assert meta["family"] == AlgorithmFamily.SYMMETRIC_CIPHER

    def test_3des_normalization(self):
        meta = normalize_algorithm("3des")
        assert meta["canonical"] == "3DES"
        assert meta["family"] == AlgorithmFamily.SYMMETRIC_CIPHER
        assert meta["quantum_status"] == QuantumStatus.VULNERABLE

    def test_pqc_and_curve448_normalization(self):
        mlkem = normalize_algorithm("mlkem")
        assert mlkem["canonical"] == "ML-KEM"
        assert mlkem["quantum_status"] == QuantumStatus.SAFE

        mldsa = normalize_algorithm("mldsa")
        assert mldsa["canonical"] == "ML-DSA"
        assert mldsa["quantum_status"] == QuantumStatus.SAFE

        ed448 = normalize_algorithm("ed448")
        assert ed448["canonical"] == "Ed448"
        assert ed448["family"] == AlgorithmFamily.DIGITAL_SIGNATURE

        x448 = normalize_algorithm("x448")
        assert x448["canonical"] == "X448"
        assert x448["family"] == AlgorithmFamily.KEY_AGREEMENT
