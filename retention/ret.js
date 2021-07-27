/*jshint esversion: 6, node: true */
const fs = require('fs')
const path = require('path')

const request = require('request')
const options = require('rc')('retention')
const Item = require('./item')
const LENGTH = 50

const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}

if (options.date.match('auto')) {
    let d = new Date()
    d.setYear(d.getFullYear() - 6)
    options.date = d.toISOString().substring(0, 10)
} else if (!options.date.match(/\d{4}-\d{2}-\d{2}/)) {
    throw Error('date value in .retentionrc is not in ISO 8601 (YYYY-MM-DD) format.')
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

const searchRequest = request.defaults({ headers: headers, json: true, qs: params })

let total = 0
let count = 0
let all_items = []
let items_to_remove = []

// collect items from a request into global array, set total in case it's changed
function collectItems (err, resp, data) {
    if (err) {
        console.error(`Error getting syllabi search results. Count was ${all_items.length}.`)
        throw err
    }
    all_items = all_items.concat(data.results.map(item => new Item(item, options)))
    items_to_remove = items_to_remove.concat(all_items.filter(item => item.toBeRemoved))
    total = data.available
    if (count >= total) {
        // this implies we're finished?
        console.log(`Total items: ${all_items.length}`)
        console.log(`Items to remove: ${items_to_remove.length}`)
    }
}

// figure out how many syllabi there are & collect them into items arrays
searchRequest.get(`${options.url}/api/search/`, (err, resp, data) => {
    if (err) throw err

    collectItems(null, null, data)
    console.log(`${total} total items`)
    // these requests fire off in parallel
    while (count < total) {
        console.log(`Getting items ${count + 1} through ${count + LENGTH}...`)
        count += LENGTH
        searchRequest.get(`${options.url}/api/search/`, { qs: { start: all_items.length } }, collectItems)
    }
})
