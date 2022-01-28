const fs = require('fs')
const https = require('https')

const fetch = require('node-fetch')
const options = require('rc')('retention')

const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 10
})
const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}

function deleteItem(item) {
    // @TODO handle locked items
    // https://vault.cca.edu/apidocs.do#operations-tag-Item_locks
    // https://vault.cca.edu/apidocs.do#operations-Items-deleteItem
    return fetch(`${options.url}/api/item/${item.uuid}/${item.version}`, { agent: agent, headers: headers, method: 'DELETE' })
        .then(res => {
            if (res.ok && (options.verbose || options.v)) {
                console.log(`Successfully deleted item https://vault.cca.edu/items/${item.uuid}/${item.version}`)
            }
        })
        .catch(err => {
            console.error(`Error deleting item https://vault.cca.edu/items/${item.uuid}/${item.version}`)
            console.error(err)
        })
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

    items.forEach(deleteItem)
}

exports.deleteItem = deleteItem

if (require.main === module) {
    main()
}
