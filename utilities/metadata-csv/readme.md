# VAULT Contribution Count

Tools to work with VAULT metadata in bulk. The idea is to export metadata from VAULT, modify it in spreadsheet software, then apply the changes back to VAULT.

## Setup

To download metadata, we need an OAuth access token with the ability to search all collections and see items in all states (draft, live, etc). To modify items, our token needs item edit privileges. We can either pass a token on the command line as `--token=${token}` or (recommended) add it to a .metadata-csvrc config file (see the included example). Any parameter passed on the command line may be added to the configuration file where it will be the default but can be overridden by CLI parameters.

Downloaded metadata requires a JSON file which maps metadata xpaths to labels, for example:

```json
{
    "/mods/name/namePart": "Creator(s)",
    "/mods/abstract": "Description"
}
```

To edit items, the CSV passes to the modify script can't use the labels. It needs a UUID column, version column, and then full-specified metadata xpaths.

| uuid | version | /xml/mods/name/namePart | /xml/mods/abstract
|---|---|---|---
| bb3190c6-b63a-4955-a9bf-a4b140df6b30 | 1 | "Eric Phetteplace" | "Example CSV"

## To Do / Questions

* How to handle multiple metadata nodes? E.g. multiple /mods/name/namePart
  * Currently, we can map columns one-by-one like `"/mods/name[1]/namePart": "Creator 1"`
* Allow a special `DELETE` value (or similar) which lets us _remove_ fields with the modify script
* Support adding new values
* Bring the two scripts into alignment
  * index.js's JSON map applies an `/xml` prefix on its own while the modify CSV expects the user to supply it
  * the CSV expects UUID & version columns but the exported metadata uses a single URL column instead

## Downloading Metadata to a CSV

Download all items matching a search into a CSV with selected metadata nodes included. See the "contribution-count" readme for search filters.

```sh
>  # example of downloading from a specific collection
> node index --collections=5e6a957b-80d4-4dee-9081-7186586fbbe5 --metadataMap map.json > coll.csv
> # getting Hamaguchi items from within Libraries collection
> node index --metadataMap hamaguchi-map.json --where="/xml/mods/relatedItem/title = 'Hamaguchi Study Print Collection'" > hamaguchi.csv
```

Any of the parameters we can pass to the openEQUELLA Search API route are accepted on the command line: https://vault.cca.edu/apidocs.do#!/search/searchItems_get_0

Secondly, write a JSON map of XML paths to CSV column headers. Examples for the Hamaguchi and Design MFA collections are included.

## Modifying Metadata in VAULT

Use the CSV of modifications described in the **Setup** section with the `modify` script. The script has usage information `node modify -h`:

```sh
Usage:
 node modify --csv input.csv [--debug] [--dryrun]

Modify records based on a CSV of metadata. The CSV must have a header row, the first column must be the item UUID, and the second column must be the item version. The rest are treaded as metadata columns where the header is the XPath of the field to be modified (e.g. "/xml/mods/abstract"). It is recommended to use full paths that start with "/xml/mods".

Options:
 --csv:     metadata changes spreadsheet
 --debug:   prints a lot more information about what's going on
 --dryrun:  do not modify records, but print XML documents
```

Only records where a change in one of the metadata fields is detected are modified. Items are modified in-place (as opposed to creating a new version with the changes). The script cannot add or remove attachments, though we can modify metadata fields that reference attachments (e.g. `/xml/mods/part`), but this would rarely make sense to do.
