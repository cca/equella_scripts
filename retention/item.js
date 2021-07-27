/*jshint esversion: 6, node: true */
const xpath = require('xpath')
const xmldom = require('xmldom').DOMParser
const CRITERIA = [isOldEnough, isntInExcludedCollection, isntHighRated, hasNoAwards]

class Item {
    constructor(item, options) {
        // take openEQUELLA item JSON and construct object from it
        // Object.entries() returns an array of key/value arrays
        Object.entries(item).forEach(pair => this[pair[0]] = pair[1] )
        let xml = new xmldom().parseFromString(item.metadata)

        this.xml = xml

        // "this" is undefined within these array methods
        // we explicitly set it to be the object being built
        CRITERIA.forEach(fn => this[fn.name] = fn(this, options), this)

        this.toBeRemoved = CRITERIA.map(c => this[c.name], this).every(b => b)
        this.toBeRetained = !this.toBeRemoved
        this.reasonsRetained = CRITERIA.filter(c => !this[c.name], this).map(fn => fn.name)
    }
}

// class Criteria {
//     constructor(description, test) {
//         this.description = description
//
//         this.test = test(item, xml, options)
//
//         CRITERIA.push(test.name)
//     }
// }

// criteria methods return TRUE if an item is to be removed
// & FALSE if it is to be retained
function isOldEnough(item, options) {
    return new Date(item.modifiedDate) < new Date(options.date)
}

function isntInExcludedCollection(item, options) {
    return !options.exclude_collections.includes(item.collection.uuid)
}

function isntHighRated(item, options) {
    return !xpath.select('string(//local/rating)', item.xml).toLowerCase().match('high')
}

function hasNoAwards(item, options) {
    // @TODO this needs more testing, review different awards XML paths
    return !xpath.select('string(//local/award)', item.xml)
}

module.exports = Item
