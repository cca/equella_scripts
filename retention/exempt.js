import fs from 'node:fs'

import rc from 'rc'
// used in commented-out exemption criteria
import xpath from 'xpath'

import Item from './item.js'
import log from './log.js'

let options = rc('retention')

let file = options.f || options.file
let dryrun = options.d || options['dry-run']

function usage() {
    console.log(`usage: node exempt.js --file items.json

Removes specified items from the retention process. This EDITS THE ITEMS
FILE IN PLACE. Don't be a dummy, back it up first.
The specifics of what items are removed are left up to the script; edit
the exemptionFilter function. Examples are provided in the source code.

Flags:
    -f, --file      the file of items to process
    --debug         print items that were exempted
    -d, --dry-run   do not edit the items file in place; instead, print items that would be exempted
    -h, --help      print this usage information

TO TEST:
    - uncomment the exemption criteria in the exemptionFilter function
    - run 'node exempt -d --debug -f data/exempt-item.json'
`)
}

if (options.h || options.help) {
    usage()
    process.exit(0)
}

if (!file) {
    console.error('Error: no items file provided. Please provide a file with the -f or --file flags.')
    usage()
    process.exit(1)
}

/**
 * determine whether an item is exempt from retention or not
 *
 * @param   {Object}  item  item from JSON data
 *
 * @return  {Boolean}        return FALSE if the item is NOT to be
 * subject to retention (in other words, if it is exempt)
 */
function exemptionFilter(item) {
    let i = new Item(item, options)
    let exempt = false

    // example: item is a VCS thesis
    // exempt = (i.collection.uuid === '49de1037-0279-41b4-8070-0f7ffcbae56d' && xpath.select('string(//local/courseWorkWrapper/courseWorkType)', i.xml).toLowerCase() === 'thesis')

    if ((dryrun || options.debug) && exempt) {
        log(`Item "${i.title}" owned by ${i.owner.id} is exempt from retention.\n${i.links.view}`)
    }

    counts.total++
    if (exempt) counts.exempt++

    return !exempt
}

function handleErr (e) { if (e) throw e }

let counts = {
    total: 0,
    exempt: 0
}

fs.readFile(file, { encoding: 'utf-8' }, (err, data) => {
    handleErr(err)
    let items = JSON.parse(data)

    // two possibilities: items is an array, or array of arrays (e.g. items grouped by owner)
    if (Array.isArray(items[0])) {
        let container = []
        items.forEach(array => {
            container.push(array.filter(exemptionFilter))
        })
        items = container
    } else {
        items = items.filter(exemptionFilter)
    }

    if (!dryrun) {
        fs.writeFile(file, JSON.stringify(items, null, 2), err => handleErr(err))
    }

    log(`${counts.exempt} exempt items out of ${counts.total} total items in ${file}.`)
})
