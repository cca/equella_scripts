/* global xml,data,user */
/* jshint undef: true */

// retrieve the data keys from a taxonomy term which is a name
// meant to be used as an On-Load ASC to fill in information from a taxonomy
// rather than make the user fill it into a form

// point this uuid at a flat taxonomy of names
// this ID is Fashion Junior Review Students
var nameTaxo = data.getTaxonomyByUuid('b48fa05e-f36c-4fb5-8096-0daa7937be9a');
var fullname = user.getLastName() + ', ' + user.getFirstName();
// searchTerms returns an iterator, not an array
var terms = nameTaxo.searchTerms(fullname);

function set (path, value) {
    if (value !== undefined) {
        xml.set(path, value);
    }
}

// note: searchTerms searches full term paths for query string _with wildcard
// appended_ (e.g. John Smith also returns John Smithsonian)
// below, we ensure the term we use actually matches the name we want
for (var i = terms.size() - 1; i >= 0; i--) {
    var term = terms.get(i);

    if (term.getTerm() == fullname) {
        var username = term.getData('username');
        var major = term.getData('major');
        var semester = term.getData('semester');
        var studentID = term.getData('studentID');
        break;
    }
}

set('mods/name/subNameWrapper/username', username);
set('mods/name/subNameWrapper/major', major);
set('local/courseInfo/semester', semester);
set('mods/name/subNameWrapper/ccaAffiliated', studentID);
