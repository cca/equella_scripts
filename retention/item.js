import { stringify } from 'csv-stringify/sync'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import xpath from 'xpath'

const CRITERIA = [isOldEnough, isntInExcludedCollection, isntHighRated, isntPPD, hasNoAwards, isntVCSThesis]
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

class Item {
    constructor(item, options) {
        // take openEQUELLA item JSON and construct object from it
        // Object.entries() returns an array of key/value arrays
        Object.entries(item).forEach(pair => this[pair[0]] = pair[1])

        this.xml = new xmldom().parseFromString(item.metadata)
        this.title = xpath.select('string(//mods/titleInfo/title)', this.xml)

        // "this" is undefined within these array methods
        // we explicitly set it to be the object being built
        CRITERIA.forEach(fn => this[fn.name] = fn(this, options), this)

        this.internalOwner = !!this.owner.id.match(UUID_REGEX)
        this.toBeRemoved = CRITERIA.map(c => this[c.name], this).every(b => b)
        this.toBeRetained = !this.toBeRemoved
        this.reasonsRetained = CRITERIA.filter(c => !this[c.name], this).map(fn => fn.name)
    }

    // ESLint doesn't support static class properties yet
    // https://stackoverflow.com/questions/60046847/eslint-does-not-allow-static-class-properties
    static CSVHeaderRow = 'link,title,status,created,modified,owner,collaborators,collection,"to remove"\n';

    toCSV() {
        // meant to serialize multiple records so it expects an array of arrays
        return stringify.CSVStringify([[
            this.links.view,
            this.title,
            this.status,
            this.createdDate,
            this.modifiedDate,
            this.owner.id,
            this.collaborators.join(', '),
            this.collection.uuid, // @TODO better to use collection name
            this.toBeRemoved
        ]])
    }

    // JSON.stringify(Item) doesn't work because of the XML object
    toJSON() {
        let obj = {}
        Object.entries(this).forEach(pair => obj[pair[0]] = pair[1])
        obj.xml = obj.xml.toString()
        return obj
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

function isntPPD(item, options) {
    return !xpath.select('string(//local/courseWorkWrapper/courseWorkType)', item.xml).toLowerCase().match('program portfolio document')
}

function hasNoAwards(item, options) {
    // @TODO this needs more testing, review different awards XML paths
    return !xpath.select('string(//local/award)', item.xml)
}

function isntVCSThesis(item) {
    return item.collection.uuid !== '49de1037-0279-41b4-8070-0f7ffcbae56d' || xpath.select('string(//local/courseWorkWrapper/courseWorkType)', item.xml).toLowerCase() !== 'thesis'
}

export default Item
