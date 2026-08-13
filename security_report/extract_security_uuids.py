#!/usr/bin/env python3
"""
Extract all G:UUID (group) and R:UUID (role) references from collection JSON files.
Outputs lists of unique groups and roles found.
"""

import json
import re
import sys


def extract_uuids(data, uuid_set):
    """Recursively extract G:UUID and R:UUID patterns from JSON"""
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, str):
                # Find all G:UUID and R:UUID patterns
                for match in re.finditer(r"([GR]):[a-f0-9-]{36}", value):
                    uuid_set.add(match.group(0))
            extract_uuids(value, uuid_set)
    elif isinstance(data, list):
        for item in data:
            extract_uuids(item, uuid_set)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: extract_security_uuids.py <collection_json_file> [<additional_files>...]"
        )
        sys.exit(1)

    uuids: set[str] = set()

    for filename in sys.argv[1:]:
        with open(filename) as f:
            data = json.load(f)
            extract_uuids(data, uuids)

    # Separate groups and roles
    groups: list[str] = sorted([u for u in uuids if u.startswith("G:")])
    roles: list[str] = sorted([u for u in uuids if u.startswith("R:")])

    print("GROUPS:")
    for g in groups:
        print(g)

    print("\nROLES:")
    for r in roles:
        print(r)
