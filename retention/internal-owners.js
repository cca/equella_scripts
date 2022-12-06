/**
 * Given a file of items, filter to the ones owned by "internal" openEQUELLA
 * accounts (e.g. eric1, ahaar1, users with UUID strings for IDs). This uses
 * the Item.internalOwner property to filter so look in item.js for details.
 *
 *  usage:
 *      node internal-owners.js -f data/items.json > internal.json
 */
import fs from 'node:fs'

import rc from 'rc'

import Item from './item.js'

const options = rc('retention', {})
const file = options.file || options.f

if (!file || typeof(file) != 'string') {
    console.error("Error: must provide a JSON file of items with the -f or --file flag.")
    process.exit(1)
}

let items = JSON.parse(fs.readFileSync(file))
items = items.filter(i => new Item(i, options).internalOwner)

console.log(JSON.stringify(items, null, 2))
