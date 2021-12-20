# VAULT Contribution Count

Download all items matching a search into a CSV with selected metadata nodes included. See the "contribution-count" readme for search filters.

```sh
>  # example of downloading from a specific collection
> node index --collections=5e6a957b-80d4-4dee-9081-7186586fbbe5
> # getting Hamaguchi items from within Libraries collection
> node index --where="/xml/mods/relatedItem/title = 'Hamaguchi Study Print Collection'"
```

Any of the parameters you can pass to the openEQUELLA Search API route are accepted on the command line: https://vault.cca.edu/apidocs.do#!/search/searchItems_get_0

Secondly, write a JSON map of XML paths to CSV column headers. An example, "metadata-map.json", is included and it covers the basics, but the metadata of our collections can differ so it needs to be adapted.

## To Do / Questions

* How to handle multiple metadata nodes? E.g. multiple /mods/name/namePart
  * Currently, you can map columns one-by-one like `"/mods/name[1]/namePart": "Creator 1"`
* Added the facility to download item _files_, too

## Setup

You need an OAuth access token with the ability to search all collections and see items in all states (draft, live, etc). You can either pass this token on the command line as `--token=${token}` or (much easier) add it to a .metadata-csvrc config file (see the included example). Any parameter passed on the command line may be added to the configuration file where it will be the default but can be overridden by CLI parameters.
