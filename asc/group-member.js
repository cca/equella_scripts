// accompanies a User Selector control
// user selector only stores username (or UUID for internal users)
// but we can use the user script object to get full name & store in MODS
var usernamesXp = 'local/courseWorkWrapper/groupMembers'
var groupMemberXp = 'local/courseWorkWrapper/groupConstituents'
var uns = xml.list(usernamesXp)

if (xml.exists(usernamesXp)) {
    // clear out existing names
    xml.deleteAll(groupMemberXp)

    for (var i = 0; i < uns.size(); i++){
        // look up this user
        var un = uns.get(i)
        var users = user.searchUsers(un) // returns an iterator

        for (var j = 0; j < users.size(); j++) {
            // find search result corresponding to user
            // NOTE: this DOES NOT WORK for internal users, whose username
            // differs from the UUID value stored by User Selector ("un" here)
            if (un == users.get(j).getUsername()) {
                var person = users.get(j)
                var givenname = person.getFirstName()
                var surname = person.getLastName()
                xml.add(groupMemberXp, givenname + ' ' + surname)
                // add them as a collaborator
                currentItem.addSharedOwner(un)
            }
        }
    }
}
