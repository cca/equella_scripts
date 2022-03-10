const fs = require('fs')
const path = require('path')

const request = require('request')
const options = require('rc')('retention', {})
options.date = require('./autodate')(options.date)
const Item = require('./item')
const LENGTH = 50

const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}

// see https://openequella.github.io/guides/RestAPIGuide.html#items-aka-resources
// query string parameters for search API route
const params = {
    info: 'detail,metadata',
    // maximum no. of items we can get in an API request
    length: LENGTH,
    modifiedBefore: options.date,
    order: "modified",
    reverse: true,
    showall: true
}

const searchRequest = request.defaults({
    headers: headers,
    json: true,
    // In node 12 the HTTP library's maxSockets was set to Infinity but this
    // breaks our script to high numbers of items because it overwhelms VAULT
    // with so many parallel requests that a TLS error is thrown.
    // see https://stackoverflow.com/a/12061013
    pool: { maxSockets: 10 },
    qs: params
})

let total = 0
let count = 0
let all_items = []

// collect items from a request into global array, set total in case it's changed
function collectItems (err, resp, data) {
    if (err) {
        console.error(`Error getting syllabi search results. Count was ${all_items.length}.`)
        throw err
    }

    all_items = all_items.concat(data.results.map(item => new Item(item, options)))
    total = data.available

    // this implies we're finished
    if (all_items.length >= total) summarize()
}

// figure out how many items there are & collect them into all_items array
searchRequest.get(`${options.url}/api/search/`, (err, resp, data) => {
    if (err) throw err

    collectItems(null, null, data)
    console.log(`${total} total items`)
    // these requests fire off in parallel
    while (count < total) {
        console.log(`Getting items ${count + 1} through ${count + LENGTH}...`)
        count += LENGTH
        searchRequest.get(`${options.url}/api/search/`, { qs: { start: count } }, collectItems)
    }
})

function summarize() {
    let items_to_remove = all_items.filter(i => i.toBeRemoved)

    console.log(`\nTotal items: ${all_items.length}`)
    console.log(`Items to remove: ${items_to_remove.length}`)
    console.log('\nReasons why items were retained')
    // isOldEnough, isntInExcludedCollection, isntHighRated, hasNoAwards
    console.log(`${'Not old enough:'.padEnd(25)} ${all_items.filter(i => !i.isOldEnough).length}`)
    console.log(`${'In excluded collection:'.padEnd(25)} ${all_items.filter(i => !i.isntInExcludedCollection).length}`)
    console.log(`${'Is highly rated:'.padEnd(25)} ${all_items.filter(i => !i.isntHighRated).length}`)
    console.log(`${'Won an award:'.padEnd(25)} ${all_items.filter(i => !i.hasNoAwards).length}\n`)

    writeOutput(items_to_remove)
}

function writeOutput(items) {
    const TODAY = new Date().toISOString().substring(0, 10)

    // write all_items to a CSV, for import into Google Sheets
    const CSVFile = path.join('data', `${TODAY}-all.csv`)
    fs.writeFile(CSVFile, Item.CSVHeaderRow + items.map(i => i.toCSV()).join(''), err => {
        if (err) throw err
        console.log(`Wrote CSV of all items to ${CSVFile}`)
    })

    const JSONFile = path.join('data', `${TODAY}-all.json`)
    fs.writeFile(JSONFile, JSON.stringify(items.map(i => i.toJSON()), null, 2), err => {
        if (err) throw err
        console.log(`Wrote JSON of all items to ${JSONFile}`)
    })
}
