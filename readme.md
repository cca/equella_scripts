# openEQUELLA Scripts

Various scripts used in VAULT (our openEQUELLA instance). The scripts are categorized by where they're used:

**asc** contains Advanced Scripting Controls used in Contribution Wizards.

**bookmarklets** are browser-side JS meant to aid in copying useful oE URLs.

**fine-arts-jr-review** is a script for biannual updates to certain data in oE.

**retention** scripts are tools for applying the [VAULT Retention Policy](https://portal.cca.edu/essentials/technology-services/web-services/vault/vault-retention-policy/).

**user-scripts** contains bulk metadata update tools meant to be run from the _Manage Resources_ section.

**utilities** are scripts for bulk processing that Manage Resources cannot handle such as downloading files, manipulating user groups, or generating taxonomies. They often interact with oE via its REST API.

## Setup

Most of these are node scripts which share dependencies. Run `pnpm install` or `npm install` to get them.

The fine arts junior review directory is a python project using [Poetry](https://python-poetry.org/). Run `poetry install` inside the directory to get the dependencies.

Most tools require their own rc file with settings, OAuth tokens, and other secrets. Each directory has an example and a readme with instructions.

## Notes

openEQUELLA's internal JavaScript engine is most likely Mozilla's [Rhino](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino), for what it's worth. That means modern JavaScript features (e.g. ES5 stuff like `Array#map`) are not available.

Probably the biggest gotcha I've found working with openEQUELLA's JavaScript is that the return value of `xml.get` on an empty metadata node _is not strictly equal to empty string_ (`xml.get('thisdoesnotexist') !== ""`). That's why conditions through these scripts will employ `!=` or `==` when checking against strings returned by `xml.get`.

## Testing

`npm test` runs the retention procedures' tests. They require a separate .equellarc file specific to the tests at the path retention/test/.testretentionrc (an example is provided). `npm run csvtest` runs the utilities/metadata-csv tests and `npm run grouptest` runs the utilities/group.js tests.

`npm run lint` lints all JavaScript.

As tests are added to other utilities, they will need to run à la carte. I usually work on one utility at a time and it doesn't make sense to run tests over all of them, especially because they tend to involve HTTP requests and thus are quite slow. View the package.json scripts for shortcuts to different tools' tests.

## LICENSE

[ECL Version 2.0](https://opensource.org/licenses/ECL-2.0)
