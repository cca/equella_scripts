import fs from 'fs'

import rc from 'rc'

import autodate from './autodate.js'
import Item from './item.js'

const options = rc('retention', {})
options.date = autodate(options.date)
const file = options.file || options.f

if (!file || typeof(file) !== 'string') {
    console.error("Error: no file provided. Please provide the path to a JSON file with the -f or --file flags.")
    process.exit(1)
}

const data = JSON.parse(fs.readFileSync(file))
// work with JSON search results or JSON from our ret.js script
let items =  Array.isArray(data.results) ? data.results.map(i => new Item(i, options)) : data.map(i => new Item(i, options))

// what else do we want to know?

// array filter, return unique items
function unique(item, index, array) {
    return array.indexOf(item) === index
}

console.log("== Summary of Items ==\n")

console.log(`${items.length} items`)
let owners = items.map(i => i.owner.id).filter(unique)
console.log(`${owners.length} unique owners\n`)

// list items by status
console.log('=== Items by Status ===\n')
items.map(i => i.status)
    .filter(unique).sort()
    .forEach(status => {
        console.log(`${status.padEnd(10)}: ${items.filter(i => i.status === status).length}`)
    })
console.log(`${'NOT live'.padEnd(10)}: ${items.filter(i => i.status !== 'live').length}\n`)

console.log('=== Items by Owner ===\n')
console.log(`Items owned by an internal user: ${items.filter(i => i.internalOwner).length}`)
console.log(`Items owned by a deleted user: ${items.filter(i => i.owner.id === "").length}`)

// map to new structure like [ { owner: "me", items: [1, 2, 3] }, ...]
let owner_items = owners.map(o => {
    return { "owner": o, "items": [] }
})
items.forEach(i => owner_items.filter(oi => oi.owner === i.owner.id)[0].items.push(i))

const max = Math.max(...owner_items.map(oi => oi.owner ? oi.items.length : 0))
const max_users = owner_items.filter(oi => oi.items.length === max).map(oi => oi.owner)
// we could look for internal owners & look their username here
console.log(`Max items owned by one user: ${max} (${max_users.join(', ')})`)

console.log(`Average items owned per user: ${Math.round((items.length / owners.length) * 100) / 100}`)

const middle = Math.floor((owners.length - 1) / 2)
const median = (owners.length % 2) ? owner_items[middle].items.length : (owner_items[middle].items.length + owner_items[middle + 1].items.length) / 2.0
console.log(`Median items owned per user: ${median}\n`)

for (let i = 1; i < 5; i++) {
    console.log(`Owners of ${i} items:  ${owner_items.filter(oi => oi.items.length === i).length}`)
}

console.log(`Owners of 5+ items: ${owner_items.filter(oi => oi.items.length > 4).length}`)
