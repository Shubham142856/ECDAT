"""
Enterprise Lab — L04: Dependency Only (no source crypto calls)
Expected evidence roles: CAPABILITY (only)
Algorithm: none from source — only from requirements.txt
The cryptography library is listed below but NEVER called in this file.
"""

import os
import json


def load_config(path: str) -> dict:
    """Load a JSON config file."""
    with open(path) as f:
        return json.load(f)


def process_records(records: list) -> list:
    """Process records — no crypto operations here."""
    return [{"id": r.get("id"), "processed": True} for r in records]
