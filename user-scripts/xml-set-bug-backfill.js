/* global currentItem,xml,user */
// after upgrading to EQUELLA 6.3 we saw a bug wherein
// calls to xml.set in the On-Load Script pane of an ASC
// wouldn't persist metadata to the item's record. This
// is a sample of the script we used to backfill in lost
// metadata for one collection that can be modified to
// suit most of our collections; the primary piece is at
// the top where mods/name/namePart is filled by finding
// the item's owner.

var id = currentItem.getOwner()
var owner = user.searchUsers(id)
var fn = owner.get(0).getFirstName()
var ln = owner.get(0).getLastName()

// only set name if a) we have both pieces, b) not set already
if (ln && fn && !xml.exists('mods/name/namePart')) {
    var name = ln + ", " + fn
    xml.set('mods/name/namePart', name)
}

// these are specific to Glass Program collection
var viewlevel = xml.get('local/viewLevel')
var type = xml.get('local/courseWorkWrapper/courseWorkType')
var setting = 'shared with other academic programs for assessment & accreditation purposes only'

// only set viewLevel if it's not already present
if (viewLevel == "") {
    // per collection's scripts these 2 types have different default viewLevel
    if (type == "Senior packet" || type == "Events") {
        setting = 'for internal Glass program use only'
    }

    xml.set('local/viewLevel', setting)
}
