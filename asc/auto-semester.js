// calculate the current semester based on the date
// this should be portable — just change the XPath target
// based on where the collection stores date/semester info

var targetXpath = 'mods/origininfo/dateCreatedWrapper/dateCreated';

// important: only fill in current date if target node is empty
// we don't want later edits to overwrite the original date
if (xml.get(targetXpath) == "") {
    var today = new Date();
    var yr = today.getFullYear();
    // JS dates indexed from 0, stupidity inherited from Java
    var mo = today.getMonth() + 1;
    // default value
    var season = 'Fall';

    if (mo < 6) {
        season = 'Spring';
    } else if (mo < 9) {
        season = 'Summer';
    } // implied season = Fall fallthrough

    var semester = season + ' ' + yr;
    xml.set(targetXpath, semester);
}

