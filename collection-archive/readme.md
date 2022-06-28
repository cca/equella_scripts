# Collection Archive

Download all (or a subset) of items from a VAULT collection. Each item becomes its own folders in the "data" directory with all its files, XML metadata, JSON data from the openEQUELLA API, and (optionally) a list of extract text fields (e.g. the title and VAULT URL of the item).

## Setup

1. `pnpm install` or `npm install` dependencies
2. create an .apprc file with an OAuth token and the root URL of the openEQUELLA instance
3. optionally edit the collection and filtering options you want into the .apprc

## Usage

```sh
# most search parameters can be passed to the script to select which items
# a collection is required
node collect --collection $UUID
```

By default item folders are named after UUID and then version. The `--name` flag makes the folder's the item's title, but titles can be duplicative or absent. An integer is append to the folder name if it would collide with an existing folder.
