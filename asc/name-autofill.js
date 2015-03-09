// a commonly-used Advanced Scripting Control
// to fill in mods/name/namePart based on user's name
// typically put in an On-Load Script
// & accompanied by a Display Template showing the name
var firstname = user.getFirstName();
var lastname = user.getLastName();
var username = user.getUsername();

var fullname = lastname + ", " + firstname;

xml.set('mods/name/namePart', fullname);
xml.set('mods/name/subNameWrapper/username', username);
