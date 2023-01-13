import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'

import { Headers, default as fetch } from 'node-fetch'
import rc from 'rc'

import autodate from './autodate.js'
import Item from './item.js'

const options = rc('retention', {})
options.date = autodate(options.date)
const LENGTH = 50

// limit number of concurrent requests or we run into an ECONNRESET error
const agent = new https.Agent({ maxSockets: 10 })
const headers = new Headers({
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
})
// query string parameters for search API route
// see https://openequella.github.io/guides/RestAPIGuide.html#items-aka-resources
let params = new URLSearchParams({
    info: 'detail,metadata',
    // maximum no. of items we can get in an API request
    length: LENGTH,
    modifiedBefore: options.date,
    order: "modified",
    reverse: true,
    showall: true,
    start: 0
})

let total = 0
// number of items _we have requested_ not number we have (which is all_items.length)
let count = 0
let all_items = []
let summarized = false

// collect items from a request into global array, set total in case it's changed
function collectItems (data) {
    all_items = all_items.concat(data.results.map(item => new Item(item, options)))
    total = data.available

    // implies we're finished, prevent repeating
    if (all_items.length >= total && !summarized) summarize()
}

// recursive function to gather all items in the search results
function search(start=0) {
    params.set('start', start)
    fetch(`${options.url}/api/search/?${params.toString()}`, { agent: agent, headers: headers })
        .then(r => {
            if (!r.ok) console.error(`HTTP error: ${r.status} ${r.statusText}`)
            return r.json()
        })
        .then(d => {
            // how EQUELLA handles API error messages
            if (d.error) {
                throw new Error(`${d.code} ${d.error}: ${d.error_description}`)
            }

            collectItems(d)
            // these requests fire off in parallel
            while (count < total) {
                console.log(`Getting items ${count + 1} through ${count + LENGTH}...`)
                count += LENGTH
                search(count)
            }
        })
}

search()

function summarize() {
    let items_to_remove = all_items.filter(i => i.toBeRemoved)

    console.log(`\nTotal items: ${all_items.length}`)
    console.log(`Items to remove: ${items_to_remove.length}`)
    console.log('\nReasons why items were retained')
    // isOldEnough, isntInExcludedCollection, isntHighRated, isntPPD, hasNoAwards
    console.log(`${'Not old enough:'.padEnd(25)} ${all_items.filter(i => !i.isOldEnough).length}`)
    console.log(`${'In excluded collection:'.padEnd(25)} ${all_items.filter(i => !i.isntInExcludedCollection).length}`)
    console.log(`${'Is highly rated:'.padEnd(25)} ${all_items.filter(i => !i.isntHighRated).length}`)
    console.log(`${'Is PPD:'.padEnd(25)} ${all_items.filter(i => !i.isntPPD).length}`)
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
