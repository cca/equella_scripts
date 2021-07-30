// you can pass any valid parameter for the search API route on the CLI
// https://vault.cca.edu/apidocs.do#!/search/searchItems_get_0
// e.g. node index --order=relevance --count=500 --status=draft --modifiedAfter=2019-09-01
const qs = require("qs")
const request = require("request")
let defaults = { length: 50, count: 200, "q": "", order: "modified" }
let options = require('rc')('contribution-count', defaults)

let headers = {
    'X-Authorization': 'access_token=' + options.token,
    'Content-Type': 'application/json',
}
let items = []
// log messages only when debug=true
let debug = (msg) => {
    if (options.debug) console.error(msg)
}

function getItems(start=0) {
    if (items.length < options.count) {
        debug(`Getting items ${items.length + 1} through ${items.length + options.length}...`)
        let reqOptions = {
            headers: headers,
            url: `${options.root}/search?start=${start}&info=detail&${qs.stringify(options)}`,
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
        collectionCount(items)
    }
}

function collectionCount(items) {
    debug(`Found ${items.length} total items matching search...`)
    debug('Counting up collection sums...')
    // will start out as a { uuid: 1 } hash & end up as
    // { uuid: { count: 1, name: Libraries } }
    let counts = {}
    items.map(i => i.collection.uuid).forEach(c => {
        // collection doesn't exist in hash yet, initialize at 0
        if (!counts[c]) counts[c] = 0
        return ++counts[c]
    })

    // convert collection UUIDs to names
    debug('Getting names for collection UUIDs...')
    let reqOptions = {
        headers: headers,
        url: `${options.root}/collection/?privilege=VIEW_ITEM&length=500`,
        json: true
    }
    let uuids = Object.keys(counts)
    request(reqOptions, (err, resp, data) => {
        if (err) throw err
        uuids.forEach(uuid => {
            counts[uuid] = {
                count: counts[uuid],
                name: data.results.find(coll => coll.uuid === uuid).name
            }
        })
        // print "sorted hash" as best we can in JS
        console.log(`${'Collection'.padEnd(41)}\tContribution count`)
        uuids.sort((a, b) => {
            return counts[b].count - counts[a].count
        }).forEach(uuid => {
            console.log(`${counts[uuid].name.padEnd(40)} \t${counts[uuid].count}`);
        });
    })
}

getItems()
