// populate name based on user information
var PROGRAM = "" // ! INSERT PROGRAM HERE!!
var firstname = user.getFirstName()
var lastname = user.getLastName()
var username = user.getUsername()
var fullname = lastname + ", " + firstname

if (!xml.exists('mods/name/namePart')) {
    xml.set('mods/name/namePart', fullname)
    xml.set('mods/name/subNameWrapper/username', username)
}

// hard-code in department as major since it's the only possible value
xml.set('/mods/name/subNameWrapper/major', PROGRAM)

// set title to "Name - Senior Packet" or similar
var worktype = 'Senior packet'
var fullTitle = firstname + " " + lastname + " - " + worktype
xml.set('/mods/titleInfo/title', fullTitle)
