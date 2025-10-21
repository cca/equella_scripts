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
# sub-collection of Libraries, note --where needs fully-specified /xml/... path
node collect --collection 6b755832-4070-73d2-77b3-3febcc1f5fad --where "/xml/mods/relatedItem/title = 'Robert Sommer Mudflats Collection'"
```

By default item folders are named after UUID and then version. The `--name` flag makes the folder's the item's title, but titles can be duplicative or absent. An integer is append to the folder name if it would collide with an existing folder (NOTE: not yet, but this is a planned development).

## Metadata Evaluation

Often we want to see the possible values a particular field takes on in the exported collection. The Fish shell technique below is useful; in this example, we look for possible mods/noteWrapper/note@type attribute values.

```sh
for i in data/*/metadata/metadata.xml;
    xmlstarlet fo $i | grep -C 2 "note type"
end
```

## Notes

HTML page attachments are downloaded and named after their UUID.

ZIPs can exist as unpacked individual files or a zip attachment, we download both if they are present.

Attachments that reference URLs or other EQUELLA items are not downloaded but present in the exported metadata.

## Testing

TODO I should write real tests for this.

```sh
# single item test
node collect --item 2e9ee5f7-9308-4d33-8b85-ba034e7015ae
# clean data dir
rm --rf data/*
# last couple items of PHOTO collection
node collect --collection dd83789b-f726-47e1-8a5f-626450d226a0 --modifiedAfter 2022-01-01 --limit 2
```
