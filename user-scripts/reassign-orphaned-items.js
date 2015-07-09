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
// per conversation with arph, "contributed" event records the original owner
// & we don't have collections where ownership transfers during item's lifecycle
// unfortunately it's not always available to user scripts
// so we have to fall back to first edit otherwise
var cxp = 'item/history/contributed'
var exp = 'item/history/edit'
var contributor = fullXml.get(cxp)
var editor = fullXml.get(exp)
var id = currentItem.getUuid()

// log msg with SCRIPT prefix so it's easy to find in logs
// can pass multiple strings which will be joined with spaces
function log () {
    var msg = Array.prototype.slice.call(arguments, 0)
    logger.log('SCRIPT: ' + msg.join(' '))
}
// accepts username string
function reassign(username) {
    if (username) {
        // verify that we have a valid user account
        var results = user.searchUsers(editor)
        if (results.size() > 0) {
            log('attempting to change owner of', id, 'to', username)
            // API dox say this "may not save" in certain contexts, great
            currentItem.setOwner(username)
        } else {
            log('unable to find', username, 'when querying users. Related item:', id)
        }
    }
}

// avoid sending an empty user.searchUsers query, which would be sloooow
if (fullXml.exists(cxp)) {
    reassign(contributor)
} else if (fullXml.exists(exp)) {
    reassign(editor)
} else {
    log('no', cxp, 'or', exp, 'nodes in item', id, 'XML')
}
