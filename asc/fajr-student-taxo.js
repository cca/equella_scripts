/* global xml,data,user */
/* jshint undef: true */

// retrieve the data keys from a taxonomy term which is a name
// meant to be used as an On-Load ASC to fill in information from a taxonomy
// rather than make the user fill it into a form

// point this uuid at a flat taxonomy of names
// this ID is Fine Arts Junior Review Students
var nameTaxo = data.getTaxonomyByUuid('b48fa05e-f36c-4fb5-8096-0daa7937be9a')
var fullname = user.getLastName() + ', ' + user.getFirstName()
var writtenname = user.getFirstName() + ' ' + user.getLastName()
// searchTerms returns an iterator, not an array
var terms1 = nameTaxo.searchTerms(fullname)
var terms2 = nameTaxo.searchTerms(writtenname)

function set(path, value) {
    if (value) {
        xml.set(path, value)
    }
}

function writeMetadata(term) {
    var username = term.getData('username')
    var major = term.getData('major')
    var semester = term.getData('semester')
    var studentID = term.getData('studentID')
    // accidentally loaded studentID under "id" key during 2020FA
    if (!studentID) studentID = term.getData('id')

    set('mods/name/subNameWrapper/username', username)
    set('mods/name/subNameWrapper/major', major)
    // also set the department value, used in All Program Work hierarchy
    set('local/department', major)
    set('local/courseInfo/semester', semester)
    set('mods/name/subNameWrapper/ccaAffiliated', studentID)
}

// note: searchTerms searches full term paths for query string _with wildcard
// appended_ (e.g. John Smith also returns John Smithsonian)
// below, we ensure the term we use actually matches the name we want
// We support both forms of names, "Surname, Givenname" and "Givenname Surname"
// via these two loops over different sets of search results.
var foundStudent = false
for (var i = terms1.size() - 1; i >= 0; i--) {
    var term = terms1.get(i)


    if (term.getTerm() == fullname) {
        writeMetadata(term)
        foundStudent = true
        break;
    }
}

for (var i = terms2.size() - 1; i >= 0; i--) {
    var term = terms2.get(i)

    if (term.getTerm() == writtenname) {
        writeMetadata(term)
        foundStudent = true
        break;
    }
}

if (!foundStudent) {
    set('debug', 'Unable to find a matching term in the Fine Arts Junior Review Students taxonomy for this user.')
}

var xp = 'local/viewLevel'
if (!xml.exists(xp)) xml.set(xp, 'for internal Fine Arts Division use only')
