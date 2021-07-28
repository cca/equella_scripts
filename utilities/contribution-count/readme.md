# VAULT Contribution Count

This script takes a VAULT search and then shows, for the given query, what the breakdown of contributions across collections is. Examples:

```sh
>  # last 500 published items
> node index --count=500
> # first 500 items published in 2018
> node index --count=500 --modifiedAfter=2018-01-01 --reverse
> # how many items were published in the Illustration Program collection before 2019
> node index --count=Infinity --modifiedBefore=2019-01-01 --collections=5e6a957b-80d4-4dee-9081-7186586fbbe5
> # the most recent 200 items that match the freetext query "painting"
> node index --q=painting
> # the most recent 200 items whose MODS title field is "Untitled"
> node index --where="/xml/mods/titleInfo/title LIKE 'Untitled'"
```

Any of the parameters you can pass to the openEQUELLA Search API route are accepted on the command line: https://vault.cca.edu/apidocs.do#!/search/searchItems_get_0

The defaults are: `length` 50 (no reason to change this, it is the maximum), `count` 200, and `order` by date last modified. The `collections` parameter is a comma-separated list of collection UUIDs. There is also a `debug` parameter which, when set, causes a few diagnostic messages to print to stderr.

## Setup

You need an OAuth access token with the ability to search all collections and see items in all states (draft, live, etc). You can either pass this token on the command line as `--token=${token}` or (much easier) add it to a .contribution-countrc config file (see the included example). Any parameter passed on the command line may be added to the configuration file where it will be the default but can be overridden by CLI parameters.

## LICENSE

[ECL Version 2.0](https://opensource.org/licenses/ECL-2.0)
