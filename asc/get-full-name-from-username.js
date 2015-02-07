// this script accompanies a User Selector control
// the user selector only stores the username in metadata
// but we can use the user script object to retrieve
// a user's full name and store it in MODS
var un = xml.get('mods/name/subNameWrapper/username')

if (un != "") {
    var users = user.searchUsers(un) // returns an iterator
    if (users.size() > 0) {
        var student = users.get(0)
        var givenname = student.getFirstName()
        var surname = student.getLastName()
        xml.set('mods/name/namePart', givenname + ' ' + surname)
    }
}
