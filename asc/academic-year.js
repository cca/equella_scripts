// calculate the current academic year based on the date
// e.g. if it's May 2014 => set date to 2013-2014
// if it's November 2011 => set to 2011-2012, etc.
// meant for use in an Advanced Scripting Control
var dateXpath = 'mods/origininfo/dateCreatedWrapper/dateCreated';

// important: only fill in current date if node is empty
// we don't want later edits to overwrite the original
if (!xml.exists(dateXpath)) {
    var today = new Date();
    var yr = today.getFullYear();
    // JS dates indexed from 0, stupidity inherited from Java
    var mo = today.getMonth() + 1;
    var value;

    if (mo < 6) {
        // it's Spring, so current year is later of the
        // the two that make up an academic year
        value = (yr - 1) + '-' + yr;
    } else {
        // current year is first of the two
        value = yr + '-' + (yr + 1);
    }

    xml.set(dateXpath, value);
}
