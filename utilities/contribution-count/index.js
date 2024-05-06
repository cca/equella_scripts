// you can pass any valid parameter for the search API route on the CLI
// https://vault.cca.edu/apidocs.do#!/search/searchItems_get_0
// e.g. node index --order=relevance --count=500 --status=draft --modifiedAfter=2019-09-01
import rc from 'rc'
import { default as fetch, Headers } from 'node-fetch'

const defaults = { length: 50, count: 200, "q": "", order: "modified" }
let options = rc('contribution-count', defaults)

const headers = new Headers({
    'X-Authorization': 'access_token=' + options.token,
    'Content-Type': 'application/json',
})
let items = []
// log messages only when debug=true
function debug () {
    if (options.debug) console.error(...arguments)
}

function getItems(start=0) {
    if (items.length < options.count) {
        debug(`Getting items ${items.length + 1} through ${items.length + options.length}...`)
        const params = new URLSearchParams(options)
        const url = `${options.root}/search?start=${start}&info=detail&${params.toString()}`

        fetch(url, {headers: headers}).then(r => r.json())
            .then(data => {
                // API sends a { code, error, error_description } error response
                if (data.error) {
                    throw new Error(`EQUELLA API Error: ${JSON.stringify(data)}`)
                }
                // the first time through, if our count is higher than the total
                // of available items, reset the count to be that total
                if (start === 0 && data.available < options.count) options.count = data.available
                items = items.concat(data.results)
                // recursively call this function until we're done
                return getItems(items.length)
            })
            .catch(e => {
                console.error(e)
                process.exit(1)
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
    items.map(i => i.collection.uuid).forEach(uuid => {
        // collection doesn't exist in hash yet, initialize at 0
        if (!counts[uuid]) counts[uuid] = 0
        return ++counts[uuid]
    })

    // convert collection UUIDs to names
    debug('Getting names for collection UUIDs...')
    const url = `${options.root}/collection/?privilege=VIEW_ITEM&length=500`

    let uuids = Object.keys(counts)
    fetch(url, {headers: headers}).then(r => r.json())
        .then(data => {
            uuids.forEach(uuid => {
                counts[uuid] = {
                    count: counts[uuid],
                    name: data.results.find(coll => coll.uuid === uuid).name
                }
            })
            // print "sorted hash" as best we can in JS
            const longestNameLen = Object.keys(counts).map(k => counts[ k ].name).sort((a, b) => b.length - a.length)[ 0 ].length
            console.log(`${'Collection'.padEnd(longestNameLen)}\tContribution count`)
            uuids.sort((a, b) => counts[ b ].count - counts[ a ].count)
                .forEach(uuid => {
                    console.log(`${counts[uuid].name.padEnd(longestNameLen)}\t${counts[uuid].count}`);
                })
        }).catch(e => {
            console.error(e)
            process.exit(1)
        })
}

getItems()
