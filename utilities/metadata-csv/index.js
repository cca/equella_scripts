// usage:
//     node index --collections=abcedf... > output.csv
// you can pass any valid parameter for the search API route on the CLI
// https://vault.cca.edu/apidocs.do#!/search/searchItems_get_0
// e.g. node index --order=relevance --count=500 --status=draft --modifiedAfter=2019-09-01
const qs = require("qs")

const CSVStringify = require('csv-stringify/sync').stringify
const request = require("request")
const xmldom = require('xmldom').DOMParser
const xpath = require('xpath')

let defaults = {
    count: 200,
    info: 'attachment,detail,metadata',
    length: 50,
    metadataMap: "./metadata-map.json",
    order: "modified",
    q: "",
}
let options = require('rc')('metadata-csv', defaults)
// subset of options to be passed to oE Search API
let searchOptions = {}
Object.assign(searchOptions, options);
[ 'debug', 'metadataMap', 'token' ].forEach(key => delete searchOptions[key])

let headers = {
    'X-Authorization': 'access_token=' + options.token,
    'Content-Type': 'application/json',
}
let items = []
// log messages only when debug=true
function debug(msg) {
    if (options.debug) console.error(msg)
}
const metadataMap = require(options.metadataMap)

function getItems(start=0) {
    if (items.length < options.count) {
        debug(`Getting items ${items.length + 1} through ${items.length + options.length}...`)
        let reqOptions = {
            headers: headers,
            url: `${options.root}/search?start=${start}&${qs.stringify(searchOptions)}`,
            json: true
        }
        request(reqOptions, (err, resp, data) => {
            if (err) {
                throw err
                // API sends a { code, error, error_description } error response
            } else if (data.error) {
                console.error('EQUELLA API Error:', data)
                process.exit(1)
            }
            // the first time through, if our count is higher than the total
            // of available items, reset the count to be that total
            if (start === 0 && data.available < options.count) options.count = data.available
            items = items.concat(data.results)
            // recursively call this function until we're done
            return getItems(items.length)
        })
    } else {
        writeCSV(items)
    }
}

function writeCSV(items) {
    debug(`Found ${items.length} total items matching search...`)

    let header = [
        'VAULT URL',
        'Title',
        'Status',
        'Date Added',
        'Date Modified',
        'Owner',
        'Collaborators',
        'Collection'
    ].concat(Object.values(metadataMap))
    console.log(CSVStringify([header]).trim())

    items.forEach(item => {
        let xml = new xmldom().parseFromString(item.metadata)
        let strings = Object.keys(metadataMap).map(xp => {
            // prefix all xpaths with /xml
            if (xp.indexOf('/') !== 0) xp = `/${xp}`
            if (xp.indexOf('/xml') !== 0) xp = `/xml${xp}`
            return xpath.select(`string(${xp})`, xml)
        })
        let row = [
            item.links.view,
            item.title,
            item.status,
            item.createdDate,
            item.modifiedDate,
            item.owner.id,
            item.collaborators.join(', '),
            item.collection.uuid
        ].concat(strings)
        // stringify expects an array of row arrays
        console.log(CSVStringify([row]).trim())
    })
}

getItems()
