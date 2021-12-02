#!/usr/bin/env node
// useful for finding location of files on server, location is
// {{data dir}}/Institutions/cca2012/Attachments/${hashCode(uuid)}/${uuid}/${version}
var hashCode = function(str){
    var hash = 0;
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash & 127;
}

if (require && require.main == module) {
    var uuid = process.argv[2]
    console.log(hashCode(uuid))
}
