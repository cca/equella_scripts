const fs = require('fs')

const request = require('request')
const options = require('rc')('retention')

const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}
const http = request.defaults({
    headers: headers,
    // In node 12 the HTTP library's maxSockets was set to Infinity but this
    // breaks our script to high numbers of items because it overwhelms VAULT
    // with so many parallel requests that a TLS error is thrown.
    // see https://stackoverflow.com/a/12061013
    pool: { maxSockets: 10 },
})

function deleteItem(item) {
    // @TODO handle locked items
    // https://vault.cca.edu/apidocs.do#operations-tag-Item_locks
    // https://vault.cca.edu/apidocs.do#operations-Items-deleteItem
    http.del(`${options.url}/api/item/${item.uuid}/${item.version}`, { headers: headers }, (err, resp, body) => {
        if (err) {
            console.error(`Error deleting item https://vault.cca.edu/items/${item.uuid}/${item.version}`)
            console.error(err)
        } else {
            if (options.verbose || options.v) {
                console.log(`Successfully deleted item https://vault.cca.edu/items/${item.uuid}/${item.version}`)
            }
        }
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
