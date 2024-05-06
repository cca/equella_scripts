# Utilities

Various utilities. The ones with subfolders will have their own readmes with explanations.

## copy-search-url

It's tedious to copy-paste Power Search URLs in templates, this script aids in that by copying them to your clipboard. You have to edit some of the variables in the script itself to match what you're trying to do (which power search, what metadata field).

## group

Add users to, or remove them from, VAULT's internal user groups. Probably the most oft-used script here; this lets us modify groups (e.g. to keep up with PM and program chair changes) without opening the admin console.

```sh
usage: node group [ add | rm ] [ --uuid | --name ] GROUP --users USERS [ --debug ]

Add or remove user(s) from an internal VAULT group. Must specify either "add" or
"rm" and must identify a group with either a --uuid or --name.

 --uuid: group UUID
 --name: group name (case insensitive)
 --users: comma-separated list of users or path to a JSON file containing an array of usernames
 --debug: print more info & complete group JSON before/after modification

To remove internal users, use their UUID. To remove LDAP users, use their username.
```

## hash-code

`node hash-code $UUID`

Calculates the "hash code" used in the path to a item's files, which is based on the UUID of the item itself. The path to the files is then `{{data dir}}/Institutions/cca2012/Attachments/${hashCode(uuid)}/${uuid}/${version}`

## new-course-code

Skaffold out the various course information taxonomies we use for each program. TODO this might as well create the "{{PROGRAM}} Faculty" and "{{PROGRAM}} Administrator" user groups, too.

## semesters

Spits out a list of Spring/Summer/Fall semester terms from a start year to an end year (edit the script to change the years). Useful for updating the semesters taxonomy or various other places we need a list of them.
