# Collection Security Analysis Scripts

These scripts help analyze security rules in EQUELLA collections by parsing JSON from the `eq` CLI tool and generating human-readable reports.

## Usage

### `parse_collection_security.py`

Main script that parses collection JSON files and generates a human-readable security report.

```bash
# 1. Get collection JSON
eq coll --name "Libraries" > data/libraries.json
eq coll --name "Libraries' eResources" > data/libraries-eresources.json
# 2. Extract role UUIDs and look them up
./extract_security_uuids.py data/libraries.json data/libraries-eresources.json > data/groups_and_roles.txt
# 3. Look up role names (copy R:UUID lines from previous output)
pbpaste | sed 's/^[GR]://' | xargs ./lookup_roles.sh > data/role_names.json
# 4. Generate the report
./parse_collection_security.py > security_report.txt
```

The script generates a report showing:

- Collection-level security rules (who can perform each privilege)
- Item status security rules (if any)
- Metadata ACLs with if conditions extracted and granted privileges

### `extract_security_uuids.py`

Extracts all G:UUID (group) and R:UUID (role) references from collection JSON files: `./extract_security_uuids.py collection1.json collection2.json`

### `lookup_roles.sh`

Looks up role names from UUIDs using the `eq role` command.

```bash
./lookup_roles.sh <uuid1> <uuid2> <uuid3> > role_names.json
# with xargs
echo "uuid1 uuid2 uuid3" | xargs ./lookup_roles.sh > role_names.json
```

## Notes

- The main parsing script currently has hardcoded paths to `data/libraries.json` and `data/libraries-eresources.json`. Modify the script if you want to analyze different collections.
- Group lookups would use `eq group <uuid>` but these collections only reference roles.
- Built-in roles like `R:TLE_LOGGED_IN_USER_ROLE` and `R:ROLE_SYSTEM_ADMINISTRATOR` are automatically resolved.
