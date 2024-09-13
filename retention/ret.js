import fs from 'node:fs'
import path from 'node:path'

import rc from 'rc'

import autodate from './autodate.js'
import Item from './item.js'

const options = rc('retention', {})
options.date = autodate(options.date)
const LENGTH = 50

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
let all_items = []
let summarized = false

// collect items from a request into global array, set total in case it's changed
function collectItems(data) {
    // for memory purposes, do not map to Item objects until we're done
    all_items.push(...data.results)
    total = data.available

    // implies we're finished, prevent repeating
    if (all_items.length >= total && !summarized) summarize()
}

// recursive function to gather all items in the search results
async function search(start=0) {
    params.set('start', start)
    const r = await fetch(`${options.url}/api/search/?${params.toString()}`, { headers: headers })
    if (!r.ok) console.error(`HTTP error: ${r.status} ${r.statusText}`)
    const d = await r.json()
    // how EQUELLA handles API error messages
    if (d.error) throw new Error(`${d.code} ${d.error}: ${d.error_description}`)

    collectItems(d)
    const count = all_items.length
    if (count < total) {
        console.log(`Getting items ${count + 1} through ${count + LENGTH}...`)
        search(count + LENGTH)
    }
}

search(0)

function summarize() {
    summarized = true
    all_items = all_items.map(item => new Item(item, options))
    let items_to_remove = all_items.filter(i => i.toBeRemoved)

    console.log('')
    console.log(`Total items: ${all_items.length}`)
    console.log(`Items to remove: ${items_to_remove.length}`)

    console.log('')
    console.log('Reasons why items were retained')
    // isOldEnough, isntInExcludedCollection, isntHighRated, isntPPD, hasNoAwards
    console.log(`${'Not old enough:'.padEnd(25)} ${all_items.filter(i => !i.isOldEnough).length}`)
    console.log(`${'In excluded collection:'.padEnd(25)} ${all_items.filter(i => !i.isntInExcludedCollection).length}`)
    console.log(`${'Is highly rated:'.padEnd(25)} ${all_items.filter(i => !i.isntHighRated).length}`)
    console.log(`${'Is PPD:'.padEnd(25)} ${all_items.filter(i => !i.isntPPD).length}`)
    console.log(`${'Won an award:'.padEnd(25)} ${all_items.filter(i => !i.hasNoAwards).length}`)
    console.log(`${'Is a thesis:'.padEnd(25)} ${all_items.filter(i => !i.isntThesis).length}`)

    console.log('')
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
