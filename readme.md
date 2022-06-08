# openEQUELLA Scripts

Various scripts used in VAULT (our openEQUELLA instance). The scripts are categorized by where they're used:

**asc** contains Advanced Scripting Controls used in Contribution Wizards.

**bookmarklets** are browser-side JS meant to aid in copying useful oE URLs.

**fine-arts-jr-review** is a script for biannual updates to certain data in oE.

**retention** scripts are tools for applying the [VAULT Retention Policy](https://portal.cca.edu/essentials/technology-services/web-services/vault/vault-retention-policy/).

**user-scripts** contains bulk metadata update tools meant to be run from the _Manage Resources_ section.

**utilities** are scripts for bulk processing that Manage Resources cannot handle such as downloading files, manipulating user groups, or generating taxonomies. They often interact with oE via its REST API.

## Notes

Note that node is needed for some of the scripts that interact with the API and `npm install` in the root of this project will get you the necessary dependencies.

openEQUELLA's internal JavaScript engine is most likely Mozilla's [Rhino](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino), for what it's worth. That means modern JavaScript features (e.g. ES5 stuff like `Array#map`) are not available.

Probably the biggest gotcha I've found working with openEQUELLA's JavaScript is that the return value of `xml.get` on an empty metadata node _is not strictly equal to empty string_ (`xml.get('thisdoesnotexist') !== ""`). That's why conditions through these scripts will employ `!=` or `==` when checking against strings returned by `xml.get`.

## LICENSE

[ECL Version 2.0](https://opensource.org/licenses/ECL-2.0)
