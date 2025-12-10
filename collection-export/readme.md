# Collection Export

Download all (or a subset) of items from a VAULT collection. Each item becomes its own folders in the "data" directory with all its files, XML metadata, JSON data from the openEQUELLA API, and a list of extracted metadata fields in HTML (e.g. the title and VAULT URL of the item).

## Setup

1. `pnpm install` or `npm install` dependencies
2. create an .apprc file with an OAuth token and the root URL of the openEQUELLA instance
3. optionally edit collection and filtering options into the .apprc

## Usage

```sh
node collect --help
Usage: node collect.js [options]

Options:
  --collection <UUID>  UUID of collection to export
  --html               Write a brief HTML index for each item
  --item <UUID>        UUID of single item to export
  --name               Use item name for export folders instead of UUID
  --verbose            Print debug info

You can also specify any valid EQUELLA search parameters such as "--status DRAFT,ARCHIVE" or "--modifiedBefore 2020-01-01".
See https://vault.cca.edu/apidocs.do#operations-tag-Searching
# a collection or item is required
node collect --collection $UUID
node collect --item $UUID --version 1
# a more complicated search
node collect --collection $UUID --status DRAFT,ARCHIVE --modifiedBefore 2020-01-01
# download items into folders that use the items' titles
node collect  --collection $UUID --name
# sub-collection of Libraries, note --where needs fully-specified /xml/... path
node collect --collection 6b755832-4070-73d2-77b3-3febcc1f5fad --where "/xml/mods/relatedItem/title = 'Robert Sommer Mudflats Collection'"
```

By default item folders are named after UUID and then version. The `--name` flag makes the folder's the item's title, but titles can be duplicative or absent. An integer is append to the folder name if it would collide with an existing folder.

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

```sh
# single item test
node collect --item 2e9ee5f7-9308-4d33-8b85-ba034e7015ae
# clean data dir
rm --rf data/*
# last couple items of PHOTO collection
node collect --collection dd83789b-f726-47e1-8a5f-626450d226a0 --modifiedAfter 2022-01-01 --limit 2
```

## Export N Random Items

The fish shell code below exports N random items from a given collection. The trick is to search for only one item (`--length` 1) and set the `start` parameter to a random number between 0 and the size of the collection. Repeats are possible, especially in smaller collections. Exporting a small set of random items is useful when smoketesting importing a collection into Invenio.

```fish
set collection 6b755832-4070-73d2-77b3-3febcc1f5fad # Libraries
set size (eq search -c $collection -l 1 | jq .available)
set n 8
for i in (seq 1 $n)
    echo "Downloading item #$i"
    set item (eq search -c $collection -l 1 --start (random 0 $size) | jq .results[0])
    echo -n $item | jq -r ".uuid, .name" ; node collect --item (echo $item | jq -r .uuid)
end
```
