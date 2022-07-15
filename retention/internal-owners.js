const fs = require('fs')

const options = require('rc')('retention', {})
const Item = require('./item')

const file = options.file || options.f
if (!file || typeof(file) != 'string') {
    console.error("Error: must provide a JSON file of items with the -f or --file flag.")
    process.exit(1)
}

let items = JSON.parse(fs.readFileSync(file))
items = items.filter(i => new Item(i, options).internalOwner)

console.log(JSON.stringify(items, null, 2))
