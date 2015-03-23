// this script accompanies a User Selector control
// the user selector only stores the username in metadata
// but we can use the user script object to retrieve
// a user's full name and store it in MODS
var unxp = 'mods/name/subNameWrapper/username'
var un = xml.get(unxp)

if (xml.exists(unxp)) {
    var users = user.searchUsers(un) // returns an iterator
    var len = users.size()

    for (var i = 0; i < len; i++) {
        if (un == users.get(0).getUsername()) {
            var person = users.get(0)
            var givenname = person.getFirstName()
            var surname = person.getLastName()
            xml.set('mods/name/namePart', givenname + ' ' + surname)
        }
    }
}
