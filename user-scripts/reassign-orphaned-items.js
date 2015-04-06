/* global currentItem,utils,logger,user */
/*******************************
reassigns the owner of an item to the last username with an edit
recorded in the item's history (item/history/edit)

usage: open up Manage Resources, filter to items with no owner
select all search results, perform action > execute script > paste this in
*******************************/

// naturally, full XML is not available via xml object for some reason
// it's missing the whole system-generated "item" subtree
// so we have to get it via currentItem
var fullXml = currentItem.getXml()
// this presumably grabs last edit? unknown
var xp = 'item/history/edit'
var lastEditor = fullXml.get(xp)
var id = currentItem.getUuid()

// log msg with SCRIPT prefix so it's easy to find in logs
// can pass multiple strings which will be joined with spaces
function log () {
    var msg = Array.prototype.slice.call(arguments, 0)
    logger.log('SCRIPT: ' + msg.join(' '))
}

// avoid sending an empty user.searchUsers query, which would be sloooow
if (fullXml.exists(xp)) {
    // used to verify that lastEditor is in fact a real user
    var results = user.searchUsers(lastEditor)
    if (results.size() > 0) {
        log('attempting to change owner of', id, 'to', lastEditor)
        // API dox say this "may not save" in certain contexts, great
        currentItem.setOwner(lastEditor)
    } else {
        log('unable to find', lastEditor, 'when querying users. Last editor of item:', id)
    }
} else {
    log('no', xp, 'node in item XML')
}
