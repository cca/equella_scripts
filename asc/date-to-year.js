// While EQUELLA let's you configure a date picker to display only the year
// the actual value that's recorded is a full date (e.g. when user selects
// "2014" the full date "2014-01-01" is value retained). This script
// accompanies any year-only date pickers; change the dateXPath to target
// the same metadata node, then put this script inside an Advanced Scripting
// Control, specifically the On-Submit Script section at the bottom.
var dateXPath = '/mods/name/subNameWrapper/gradDate',
    date = xml.get(dateXPath);

// weird behavior; if EQUELLA doesn't recognize date value it'll set it to 
// "2020" (no month, no day), below we work around that
if (date != '' && date != '2020') {
    var year = date.substr(0,4);
    xml.set(dateXPath, year);
}
