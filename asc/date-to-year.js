// While EQUELLA let's you configure a date picker to display only the year
// the actual value that's recorded is a full date (e.g. when user selects
// "2014" the full date "2014-01-01" is value retained). This script
// accompanies any year-only date pickers; change the dateXPath to target
// the same metadata node, then put this script inside the Expert Scripting
// Save Script.
//
// Note that, unfortunately due to a bug in the way EQUELLA reads back dates
// into the datepicker form UI, you need a staging area to store the (full
// length) date and then a destination path which will store the year only.
var date = String(xml.get('mods/name/subNameWrapper/staging'));

// weird behavior; if EQUELLA doesn't recognize date value it'll set it to
// "2020" (no month, no day), below we work around that
if (date !== '') {
    var year = date.substr(0, 4);
    xml.set('mods/name/subNameWrapper/gradDate', year);
}

date = String(xml.get('/mods/origininfo/dateCreatedWrapper/staging'));
if (date !== '') {
    year = date.substr(0, 4);
    xml.set('/mods/origininfo/dateCreatedWrapper/dateCreated');
}
