// the converse of hide-name.js, obv

var tmp = xml.get('tmp')
var xp = 'mods/titleInfo/title'

// guard against screwing with items that weren't in the original batch
if (tmp != "") {
    xml.set(xp, tmp)
    xml.deleteAll('tmp')
}
