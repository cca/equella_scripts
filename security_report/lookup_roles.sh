#!/bin/bash
# Look up role names from UUIDs using the eq CLI tool
# Outputs JSON mapping of R:UUID to role names
set -euo pipefail # bash strict mode

if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: lookup_roles.sh <role_uuid> [<additional_uuids>...]"
    exit
fi

echo "{"
count=$#
i=0
for uuid in "$@"; do
    i=$((i+1))
    name=$(eq role "$uuid" 2>/dev/null | jq -r '.name')
    echo "  \"R:$uuid\": \"$name\""
    if [ $i -lt $count ]; then
        echo ","
    fi
done
echo "}"
