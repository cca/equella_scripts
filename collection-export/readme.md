# Collection Export

Download all (or a subset) of items from a VAULT collection. Each item becomes its own folders in the "data" directory with all its files, XML metadata, JSON data from the openEQUELLA API, and a list of extracted metadata fields in HTML (e.g. the title and VAULT URL of the item).

## Setup

1. `pnpm install` or `npm install` dependencies
2. create an .apprc file with an OAuth token and the root URL of the openEQUELLA instance
3. optionally edit the collection and filtering options you want into the .apprc
4. edit the `itemToHTML` function in collect.js if you want to capture particular metadata fields

## Usage

```sh
# most search parameters can be passed to the script to select which items
# a collection or item is required
node collect --collection $UUID
node collect --item $UUID
# example of a more complicated search
node collect --collection $UUID --status DRAFT,ARCHIVE --modifiedBefore 2020-01-01
# download items into folders that use the items' titles
node collect  --collection $UUID --name
```

By default item folders are named after UUID and then version. The `--name` flag makes the folder's the item's title, but titles can be duplicative or absent. An integer is append to the folder name if it would collide with an existing folder (NOTE: not yet, but this is a planned development).
