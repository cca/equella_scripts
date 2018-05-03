// a commonly-used Advanced Scripting Control
// to fill in mods/name/namePart based on user's name
// typically put in an On-Load Script
// & accompanied by a Display Template showing the name
var givenname = user.getFirstName();
var surname = user.getLastName();
var username = user.getUsername();

var fullname = surname + ", " + givenname;

xml.set('mods/name/namePart', fullname);
xml.set('mods/name/subNameWrapper/username', username);
