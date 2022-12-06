// chunk a large items.json into smaller pieces for emailing
// the chunks are all items owned by the same N users where N is the
// --size argument to this script (default 100)
// NOTE: `chunk` does NOT gaurantee any particular number of items because
// owners own different numbers of items. The goal is to send the same number
// of emails to users in each group, not be the same number of items.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import rc from 'rc'

import { groupByOwner } from './contact.js'
import log from './log.js'

/**
 * chunk items in sets of N owners' items
 *
 * @param   {Object}  groupedItems  return value of groupByOwner(items)
 * looks like { "me": [my, items, ...], "you": [your, items, ...] }
 * @param   {Number}  size   number of owners per chunk
 *
 * @return  {Array[Item[]]}         array of arrays of items
 */
export function chunk(groupedItems, size) {
    let chunks = []
    let owners = Object.keys(groupedItems)
    // i = the current chunk, j = the current owner
    for (let i = 0; i < Math.ceil(owners.length / size); i++) {
        for (let j = i * size; j < (i + 1) * size && j < owners.length; j++) {
            if (Array.isArray(chunks[i])) {
                chunks[i].push(groupedItems[owners[j]])
            } else {
                chunks[i] = [groupedItems[owners[j]]]
            }
        }
    }
    return chunks
}

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    const options = rc('retention', { "size": 100 })
    const file = options.file || options.f

    if (!file) {
        console.error("Error: no file provided. Please provide the path to a JSON file with the -f or --file flags.")
        process.exit(1)
    }

    let items = JSON.parse(fs.readFileSync(file))
    items = groupByOwner(items)
    let chunks = chunk(items, options.size)
    log(`Splitting ${file} into ${chunks.length} chunks of items owned by ${options.size} users.`)
    chunks.forEach((items, index) => {
        let filename = path.join('data', `items-${index + 1}.json`)
        fs.writeFile(filename, JSON.stringify(items, null, 2), err => {
            if (err) throw err
            log(`Wrote one chunk of ${options.size} owners' items to ${filename}`)
        })
    })
}
