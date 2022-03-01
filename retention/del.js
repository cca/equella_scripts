const fs = require('fs')
const https = require('https')

const fetch = require('node-fetch')
let options = require('rc')('retention')

// tests run from root with a different rc file
// so if we're testing, we load the test configuration
if (options._[0] === 'retention/test') {
    options = JSON.parse(fs.readFileSync('.testretentionrc'))
}

options.verbose = options.v || options.verbose

// specify an HTTP agent so we can set maxSockets to < Infinity
const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 10
})
const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token
}

function unlockItem(item) {
    // https://vault.cca.edu/apidocs.do#operations-tag-Item_locks
    // we don't care if the item is locked or not, we're going to delete it anyways
    // so paradoxically _if this request fails_ we don't care, but success means the
    // item was locked when we wanted to delete it
    return fetch(
        `${options.url}/api/item/${item.uuid}/${item.version}/lock`,
        { agent: agent, headers: headers, method: 'DELETE' }
    )
}

function deleteItem(item) {
    // https://vault.cca.edu/apidocs.do#operations-Items-deleteItem
    return fetch(
        `${options.url}/api/item/${item.uuid}/${item.version}`,
        { agent: agent, headers: headers, method: 'DELETE' }
    )
}

function main() {
    let items_file = options.file || options.f
    if (typeof items_file !== 'string') {
        console.error("Error: please supply a file of items to delete with the --file or -f flag.")
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
    }

    items.forEach(i => unlockItem(i).then(res => {
        if (res.ok && options.verbose) {
                console.log(
                    `Successfully unlocked item https://vault.cca.edu/items/${item.uuid}/${item.version}`
                )
            }
        }).then(res => {
            deleteItem(i).then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP status of the reponse: ${res.status} ${res.statusText}.`)
                } else if (options.verbose) {
                    console.log(`Successfully deleted item https://vault.cca.edu/items/${item.uuid}/${item.version}`)
                }
            }).catch(err => {
                console.error(`Error deleting item https://vault.cca.edu/items/${item.uuid}/${item.version}`, err)
            })
        }).catch(err => {
            // we're happy that this only catches networking errors, not non-2XX HTTP responses,
            // because when you try to unlock an already-unlocked item you'll get a 404
            console.error(`Error unlocking item https://vault.cca.edu/items/${item.uuid}/${item.version}`, err)
        })
    )
}

exports.unlockItem = unlockItem
exports.deleteItem = deleteItem

if (require.main === module) {
    main()
}
