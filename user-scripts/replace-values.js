// example of replacing the value of a field with a new value
// this takes 1975-1979 temporal subjects and replaces it with 1970-1979
var subs = xml.getAllSubtrees('/mods/subject/temporal')
var len = subs.length
for (var i = 0; i < len; i++) {
    var sub = subs[i]
    if (sub.get('/') == '1975-1979') {
        sub.set('/', '1970-1979')
    }
}
