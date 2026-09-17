# Collection Export

Download all (or a subset) of items from a VAULT collection. Each item becomes its own folders in the "data" directory with all its files, XML metadata, JSON data from the openEQUELLA API, and a list of extracted metadata fields in HTML (e.g. the title and VAULT URL of the item).

## Setup

1. `pnpm install` or `npm install` dependencies
2. create an .apprc file with an OAuth token and the root URL of the openEQUELLA instance
3. (optional) edit collection and filtering options into the .apprc
4. (optional) to validate MODS XML, download [mods.xsd](https://www.loc.gov/standards/mods/v3/mods.xsd) and install `xmllint` (e.g. `brew install xmllint`)
5. (optional) `xmlstarlet` to format (`xmlstarlet fo`) XML files (`brew install xmlstarlet`)

## Usage

```sh
node collect --help
Usage: node collect.js [options]

Options:
  --collection <UUID>  UUID of collection to export
  --html               Write a brief HTML index
  --item <UUID>        UUID of single item to export
  --name               Use item name for export folders instead of UUID
  --no-map             Do not apply collection-specific MODS maps
  --no-mods            Do not write strict MODS XML
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
# sub-collection of Libraries, note --where needs fully-specified /xml/... xpath
node collect --collection 6b755832-4070-73d2-77b3-3febcc1f5fad --where "/xml/mods/relatedItem/title = 'Robert Sommer Mudflats Collection'"
# download syllabi & convert their metadata to MODS
node collect --collection (eq coll --name "Syllabus Collection" | jq -r .uuid) --syllabus --limit 10
```

By default item folders are named after UUID and then version. The `--name` flag makes the folder's the item's title, but titles can be duplicative or absent. An integer is appended to the folder name if it would collide with an existing folder.

## Attachment Notes

HTML page attachments are downloaded and named after their UUID.

ZIPs can exist as unpacked individual files or a zip attachment; we download both if they are present.

Attachments that reference URLs or other EQUELLA items are not downloaded but present in the exported metadata.

## Testing Collection Export

```sh
# single item test
node collect --item 2e9ee5f7-9308-4d33-8b85-ba034e7015ae
# last couple items of PHOTO collection
node collect --collection dd83789b-f726-47e1-8a5f-626450d226a0 --modifiedAfter 2022-01-01 --limit 2
```

## Export N Random Items

The fish shell code below exports N random items from a given collection. The trick is to search for only one item (`--length` 1) and set the `start` parameter to a random number between 0 and the size of the collection. Repeats are possible, especially in smaller collections.

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

## MODS Metadata Conversion

The `strict-mods.js` module used in collect.js converts EQUELLA's custom MODS XML to strict MODS 3.8 schema-compliant XML by unwrapping custom wrapper elements, removing non-standard elements and attributes, and creating child elements where necessary (e.g. `mods/language` -> `mods/language/languageTerm`.). Our MODS implementation uses custom "wrapper" elements (like `typeOfResourceWrapper`, `genreWrapper`, `noteWrapper`) that are not part of the official schema to work with EQUELLA's contribution form repeaters.

### Collection-specific Metadata Conversion

Various collections have specific mappings to MODS beyond the strict MODS conversion, doing things like handling special `/local` fields or adding contextual information that is unique to each collection (e.g. a `mods/genre` of "syllabi" for all items in the Syllabus Collection). Each collection-specific mapping has its own script in the [`mdmaps`](./mdmaps/) directory and these scripts can be used a la carte to test conversions on individual XML files. They also have their own test suites as package.json scripts available to `npm run`.

`node collect` automatically performs collection-specific XML to MODS conversions for any items in the collections listed below. Pass `--no-map` to opt out of this behavior.

Mapped collections:

- Assessment & Accreditation Documents
- Art Collection
- Open Access Journal Articles (i.e. Design Book Review)
- Press Clips
- Syllabus collection

### Converting & Validating MODS Files

```sh
# Run all XML mapping tests, strict MODS and collection-specific conversions
npm run exportxmltest
# Test random samples from exported JSON files
node mdmaps/test-collection-samples.js data/mudflats.json 10
```

The [`test-collection-samples.js`](./mdmaps/test-collection-samples.js) script tests random samples of XML metadata from exported EQUELLA JSON files against the strict-mods.js library to verify conversions work correctly.

Below are examples of conversions and validations against the MODS schema using `xmllint`.

```sh
# Convert an item's metadata to strict MODS
node mdmaps/strict-mods.js data/item-uuid/metadata/metadata.xml
# Example of collection-specific conversion (Syllabus)
node mdmaps/syllabus.js fixtures/syllabus-one-faculty.xml
# Validate against the MODS 3.8 schema (requires xmllint)
# First download the MODS schema: https://www.loc.gov/standards/mods/mods-schemas.html
wget https://www.loc.gov/standards/mods/v3/mods-3-8.xsd -O data/mods.xsd
node mdmaps/strict-mods.js data/item-uuid/metadata/metadata.xml | \
    xmllint --noout --schema data/mods.xsd -
```
