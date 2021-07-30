// a lot of items end up with their UUID as a name if their collection
// Wizard doesn't use the metadata schema's title node
// this script iterates over them & sets their title to whatever nodes
// you specify in the "titleNodes" array, with a specified separator
// between each
//
// To use: open up Manage Resources > filter to the items you want >
// Select all > Perform an action > Execute script > use this script

var titleXPath = 'mods/titleInfo/title',
    title = xml.get(titleXPath),
    // array of XPaths to fields you want in the title
    // will be used in this order
    titleNodes = [
        'mods/name/namePart',
        'local/courseInfo/semester',
        'local/courseInfo/course',
        'local/courseInfo/faculty'
    ],
    makeNewTitle = function (paths, separator) {
        var newTitle = [], len = paths.length;
        // default to hyphen padded w/ spaces
        separator = separator !== undefined ? separator : ' - ';

        for (var i = 0; i < len; i++) {
            // we have to use non-strict equals
            // because xml.get() doesn't actually return empty string
            // when the node is empty - applies here & in if below
            if (xml.get(paths[i]) != "") {
                newTitle.push(xml.get(paths[i]));
            }
        }

        return newTitle.join(separator);
    };

// chances are title node is just empty string
// but if not, we only rename if it looks like a UUID
// UUIDs are hexadecimal, pattern:
// [8 chars]-[4 chars]-[4 chars]-[4 chars]-[12 chars]
if (title == "" || title.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)) {
    xml.set(titleXPath, makeNewTitle(titleNodes));
}
