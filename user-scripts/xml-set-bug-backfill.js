/* global currentItem,xml,user */
// after upgrading to EQUELLA 6.3 we saw a bug wherein
// calls to xml.set in the On-Load Script pane of an ASC
// wouldn't persist metadata to the item's record. This
// is a sample of the script we used to backfill in lost
// metadata for one collection that can be modified to
// suit most of our collections; the primary piece is at
// the top where mods/name/namePart is filled by finding
// the item's owner.

var itemID = currentItem.getUuid()
var userID = currentItem.getOwner()
var users = user.searchUsers(userID)
var len = users.size()

for (var i = 0; i < len; i++) {
    if (users.get(i).getUniqueID() == userID) {
        var fn = users.get(i).getFirstName()
        var ln = users.get(i).getLastName()
        break
    }
}

// only set name if a) we have both pieces, b) not set already
if (ln && fn && !xml.exists('mods/name/namePart')) {
    var xp = 'mods/name/namePart'
    var name = ln + ", " + fn
    xml.set(xp, name)
    logger.log('Set ' + xp + 'of item ' + itemID + 'to ' + name + '.')
}

// these are specific to Glass Program collection
xp = 'local/viewLevel'
var type = xml.get('local/courseWorkWrapper/courseWorkType')
var setting = 'shared with other academic programs for assessment & accreditation purposes only'

// only set viewLevel if it's not already present
if (!xml.exists(xp)) {
    // per collection's scripts these 2 types have different default viewLevel
    if (type == "Senior packet" || type == "Events") {
        setting = 'for internal Glass program use only'
    }

    xml.set(xp, setting)
    logger.log('Set ' + xp + 'of item ' + itemID + 'to ' + setting + '.')
}
