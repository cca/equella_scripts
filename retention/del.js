/**
 * usage: node del -f data/items.json [ -v | --verbose ] [ --sleep MS ]
 *
 * Delete items in the provided file (-f or --file flag).
 * --sleep X: sleep X milliseconds in between each item deletion (default = 2000)
 * The recommended way to run this script is to pipe its output to stdout & a
 * log file, then rename the items file it's deleted, e.g.
 *
 *   node del -f data/items-1.json &| tee -a data/log.txt && mv -v \
 *   data/items-1.json data/deleted-items-1.json
 */
import fs from 'node:fs'
import https from 'node:https'
import { pathToFileURL } from 'node:url'

import fetch from 'node-fetch'
import rc from 'rc'

import log from './log.js'
import sleep from './sleep.js'

let options = rc('retention', { sleep: 2000 })

// tests run from root with a different rc file
// so if we're testing, we load the test configuration
if (options._[0] === 'retention/test') {
    options = JSON.parse(fs.readFileSync('.testretentionrc'))
}

options.verbose = options.v || options.verbose

// specify an HTTP agent so we can set maxSockets to < Infinity
const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    rejectUnauthorized: false,
})
const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token
}

/**
 * unlock VAULT item if it's locked
 *
 * the fetch request will return a 400 HTTP response if the item
 * is not locked (which will be the case most of the time) but
 * we can just ignore it, no harm has been done
 *
 * @param   {Item}  item
 *
 * @return  {Promise}        fetch HTTP request promise from VAULT API
 */
export function unlockItem(item) {
    // https://vault.cca.edu/apidocs.do#operations-tag-Item_locks
    // we don't care if the item is locked or not, we're going to delete it anyways
    // so paradoxically _if this request fails_ we don't care, but success means the
    // item was locked when we wanted to delete it
    return fetch(
        `${options.url}/api/item/${item.uuid}/${item.version}/lock`,
        { agent: agent, headers: headers, method: 'DELETE' }
    )
}

/**
 * delete VAULT item
 *
 * @param   {Item}  item
 *
 * @return  {Promise}        fetch HTTP request promise from VAULT API
 */
export function deleteItem(item) {
    // https://vault.cca.edu/apidocs.do#operations-Items-deleteItem
    return fetch(
        `${options.url}/api/item/${item.uuid}/${item.version}`,
        { agent: agent, headers: headers, method: 'DELETE' }
    )
}

/**
 * return link to openEQUELLA item in VAULT (hardcodes our domain)
 *
 * @param   {Item}  item
 *
 * @return  {string}        HTTPS link to view item in browser
 */
function vaultUrl(item) {
    return `https://vault.cca.edu/items/${item.uuid}/${item.version}`
}

async function main() {
    let items_file = options.file || options.f
    if (typeof items_file !== 'string') {
        console.error('Error: please supply a file of items to delete with the --file or -f flag.')
        process.exit(1)
    }

    let items = JSON.parse(fs.readFileSync(items_file))
    if (!Array.isArray(items)) {
        // also handle { ..., results: [...]} format of VAULT search JSON
        if (!Array.isArray(items.results)) {
            console.error(`Error: unable to find items array in ${items_file}`)
            process.exit(1)
        }
        items = items.results
    } else if (Array.isArray(items[0])) {
        // handled items grouped by owner (arrays of arrays)
        let unpacked_items = []
        items.forEach(a => unpacked_items = unpacked_items.concat(a))
        items = unpacked_items
    }

    // we do a for-of loop instead of items.forEach so we can sleep() in
    // between deletes & not DDOS our own server
    for (const item of items) {
        unlockItem(item).then(res => {
            if (res.ok && options.verbose) {
                log(`Successfully unlocked item ${vaultUrl(item)}`)
            }
        }).then(res => {
            deleteItem(item).then(res => {
                if (!res.ok) {
                    if (res.status === 404) {
                        log(`404 deleting item ${vaultUrl(item)} it's already deleted`)
                    } else {
                        throw new Error(`HTTP status: ${res.status} ${res.statusText}`)
                    }
                } else if (options.verbose) {
                    log(`Successfully deleted item ${vaultUrl(item)}`)
                }
            }).catch(err => {
                // deleteItem error
                console.error(`Error deleting item ${vaultUrl(item)}\n`, err)
            })
        }).catch(err => {
            // unlockItem error
            // we're happy that this only catches networking errors, not non-2XX HTTP responses,
            // because when you try to unlock an already-unlocked item you get a 404
            console.error(`Error unlocking item ${vaultUrl(item)}\n`, err)
        })
        await sleep(options.sleep)
    }
}

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    main()
}
