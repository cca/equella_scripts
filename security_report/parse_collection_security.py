#!/usr/bin/env python3
import json
import re

# Load role name mappings
with open("data/role_names.json") as f:
    role_names = json.load(f)


def resolve_name(ref):
    """Resolve G:UUID or R:UUID to human-readable name"""
    if ref in role_names:
        return role_names[ref]
    # Handle special built-in roles
    if ref == "R:TLE_LOGGED_IN_USER_ROLE":
        return "Logged In Users"
    if ref == "R:ROLE_SYSTEM_ADMINISTRATOR":
        return "System Administrator"
    # Handle owner
    if ref == "$OWNER":
        return "Item Owner"
    if ref == "*":
        return "Everyone"
    return ref


def parse_who(who_str) -> list[str]:
    """Parse WHO clause into a list of roles/groups/users"""
    if not who_str or who_str.strip() == "":
        return ["Everyone"]

    items = []
    # Split by spaces and OR
    tokens = re.split(r"\s+OR\s+|\s+", who_str)

    for token in tokens:
        token = token.strip()
        if not token or token == "OR":
            continue

        if token.startswith("U:"):
            items.append(f"User: {token[2:]}")
        elif token.startswith(("G:", "R:", "$")):
            items.append(resolve_name(token))
        elif token == "*":
            items.append("Everyone")

    return items if items else ["Everyone"]


def parse_rules(rules, title) -> str:
    """Parse security rules and format them"""
    output: list[str] = []
    output.append(f"\n{'=' * 80}")
    output.append(f"{title}")
    output.append(f"{'=' * 80}\n")

    for rule in rules:
        privilege: str = rule.get("privilege", "UNKNOWN")
        who_list: list[str] = parse_who(rule.get("who", ""))

        output.append(f"• {privilege}")
        for who in who_list:
            output.append(f"    - {who}")
        output.append("")

    return "\n".join(output)


def extract_condition(script):
    """Extract the main condition from the if statement in the script"""
    if not script:
        return None

    # Look for the pattern: if( ... )
    match = re.search(r"if\s*\(\s*(.+?)\s*\)\s*\{", script, re.DOTALL)
    if match:
        condition = match.group(1).strip()
        # Clean up any newlines and extra whitespace
        condition = " ".join(condition.split())
        return condition

    return script.strip()


def parse_metadata_rules(metadata_obj, title):
    """Parse metadata ACL rules with conditions"""
    output = []
    output.append(f"\n{'=' * 80}")
    output.append(f"{title}")
    output.append(f"{'=' * 80}\n")

    # metadata_obj is a dict where keys are UUIDs
    for rule_data in metadata_obj.values():
        name = rule_data.get("name", "Unnamed ACL")
        script = rule_data.get("script", "")

        output.append(f"▸ {name}")
        if script:
            condition = extract_condition(script)
            if condition:
                output.append(f"  Condition: {condition}")

        # Parse the entries (grants)
        entries = rule_data.get("entries", [])
        if entries:
            output.append("  Grants:")
            for entry in entries:
                privilege = entry.get("privilege", "UNKNOWN")
                who_list = parse_who(entry.get("who", ""))

                output.append(f"    • {privilege}")
                for who in who_list:
                    output.append(f"        - {who}")
        output.append("")

    return "\n".join(output)


def parse_collection(filename, collection_name):
    """Parse a collection's security rules"""
    with open(filename) as f:
        coll = json.load(f)

    output = []
    output.append("\n" + "=" * 80)
    output.append(f"COLLECTION: {collection_name}")
    output.append(f"UUID: {coll.get('uuid', 'UNKNOWN')}")
    output.append("=" * 80)

    # Security section
    if "security" in coll:
        security = coll["security"]

        # Collection-level rules
        if "rules" in security:
            output.append(
                parse_rules(security["rules"], "Collection-Level Security Rules")
            )

        # Item status rules
        if "itemStatuses" in security:
            for status, rules_list in security["itemStatuses"].items():
                output.append(
                    parse_rules(rules_list, f"Item Status Security: {status}")
                )

        # Metadata ACLs
        if "metadata" in security:
            output.append(
                parse_metadata_rules(
                    security["metadata"], "Metadata ACLs (Conditional Security Rules)"
                )
            )

    return "\n".join(output)


# Parse both collections
report: list[str] = []
try:
    report.append(parse_collection("data/libraries.json", "Libraries"))
except FileNotFoundError:
    print("Warning: data/libraries.json not found. Skipping Libraries collection.")
try:
    report.append(
        parse_collection("data/libraries-eresources.json", "Libraries' eResources")
    )
except FileNotFoundError:
    print(
        "Warning: data/libraries-eresources.json not found. Skipping Libraries' eResources collection."
    )

# Write report
full_report: str = "\n".join(report)
with open("security_report.txt", "w") as f:
    f.write(full_report)

print(full_report)
