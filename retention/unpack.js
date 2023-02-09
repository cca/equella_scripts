/**
 * provided with a bunch of JSON files with nested arrays of items, unpack them
 * usage:
 * node retention/unpack.js -data/items-1.json -data/items-2.json -data/items-3.json > unpacked.json
 * OR
 * node retention/unpack.js -data/items-*.json > unpacked.json
 */
import fs from 'node:fs'

const files = process.argv.slice(2)
const unpack = (arr) => {
    let items = []
    arr.forEach(item => {
        if (Array.isArray(item)) {
            items = items.concat(unpack(item))
        } else {
            items.push(item)
        }
    })
    return items
}

let items = []

files.forEach(file => {
    console.error(`Reading ${file}...`)
    const data = fs.readFileSync(file, 'utf8')
    items = items.concat(unpack(JSON.parse(data)))
    console.error(`Unpacked ${items.length} total items`)
})

console.log(JSON.stringify(items, null, 2))
