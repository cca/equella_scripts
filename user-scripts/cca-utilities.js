/* global exports,item,xml,logger,currentItem,utils,user */
// user script module of handy methods
// we name it "CCA" so methods defined below can be imported & used like
//
// var cca = require('cca')
// cca.log("hey I'm logged in the context of the item I'm operating on!")
//
// see the EQUELLA 6.3 Feature Guide PDF for details on how this works


// run with any number of strings & it'll insert them into EQUELLA's logs
// alongside the item ID & version
function log () {
    var msg = [
            'SCRIPT:',
            'item', item.getUuid() + '/' + item.getVersion()
            // oh you want to see some JavaScript? here's some JavaScript
        ].concat(Array.prototype.slice.call(arguments)).join(' ')

    logger.log(msg)
}


/*******************************
reassigns the owner of an item to the last username with an edit
recorded in the item's history (item/history/edit)

usage: open up Manage Resources, filter to items with no owner
select all search results, perform action > execute script > paste this in
*******************************/
function reowner () {
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
    var reassign = function (username) {
        if (username) {
            // verify that we have a valid user account
            var results = user.searchUsers(editor)
            if (results.size() > 0) {
                log('attempting to change owner to', username)
                // API dox say this "may not save" in certain contexts, great
                currentItem.setOwner(username)
            } else {
                log('unable to find', username, 'when querying users.')
            }
        }
    }

    // avoid sending an empty user.searchUsers query, which would be sloooow
    if (fullXml.exists(cxp)) {
        reassign(contributor)
    } else if (fullXml.exists(exp)) {
        reassign(editor)
    } else {
        log('no', cxp, 'or', exp, 'nodes in XML')
    }
}

// light abstractions over XML methods, solves a few common problems, e.g.
// 1) xml.get('thisNodeDoesntExist') !== ''     => False
// 2) xml.set('node', someValueWeDontHave)      => <node>undefined</node>

// get value from XML, coercing into a string
function get (path) {
    return String(xml.get(path))
}

// set value in XML, but only if we pass a non-empty string
function set (path, str) {
    if (str && str !== '') {
        xml.set(path, str)
    }
}

// given an external review taxonomy term, add item to it
// terms look like: Spring 2017\External Review\Sculpture
function addToReview (term) {
    var a = term.split('\\')
        , semester = a[0]
        , type = a[1]
        , program = a[2]
        , xp = 'local/assessmentWrapper/'

    set(xp + 'staging', term)
    set(xp + 'useInReview', 'yes')
    set(xp + 'type', type)
    set(xp + 'program', program)
    set(xp + 'date', semester)
    set('local/accreditation', term.replace(/\\/g, ' '))
    log('added to ' + term)
}

// change name metadata fields from old name to new
function nameChange(oldName, newName) {
    // @TODO do we loop over namePart nodes or naively `xml.set` the first one?
    var list = xml.list('mods/name/namePart')

    for (var i = 0; i < list.size(); i++) {
        if (list.get(i) == oldName) {
            xml.set('mods/name[' + (i + 1) + ']/namePart', newName)
        }
    }
}

exports = {
    'addToReview': addToReview,
    'get': get,
    'log': log,
    'nameChange': nameChange,
    'reowner': reowner,
    'set': set
}
