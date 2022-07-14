/**
 * look up collection and user information for an item
 * adds the collection name to the item's JSON
 * and adds user information to the `owner` field if it's found
 * then overwrites the original JSON file
 */

const fs = require('fs')
const https = require('https')

const fetch = require('node-fetch')
let options = require('rc')('retention')

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
const fetch_options = { headers: headers, agent: agent }
const collections_file = 'data/collections.json'

function writeCollections(data) {
    fs.writeFile(collections_file, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error(`Error writing ${collections_file} file`)
            console.error(err)
        }
    })
}

// load downloaded collections JSON or, if we don't have it, get it from API
async function getCollections() {
    try {
        const collections = require(collections_file)
        return collections
    } catch (e) {
        let response = await fetch(`${options.url}/api/collection/?length=500`, fetch_options)
        let data = await response.json()
        let collections = data.results
        // write a data file but without blocking
        writeCollections(collections)
        return collections
    }
}

function embedUser(user, item) {
    Object.keys(user).forEach(key => {
        item.owner[key] = user[key]
    })
    item.owner.fullName = `${user.firstName} ${user.lastName}`
    return item
}

function embed(item) {
    if (options.debug) console.log(`Embedding data in item ${item.uuid} no. ${embedded_items.length}`)

    item.collection.name = collections.find(c => c.uuid === item.collection.uuid).name

    let user = users.find(u => u.uniqueID === item.owner.id)
    if (user) {
        item = embedUser(user, item)
        embedded_items.push(item)
        return finish()
    } else {
        // get user data from API and cache it in the users object
        fetch(`${options.url}/api/userquery/userinfobackup?uniqueId=${item.owner.id}`, fetch_options)
            .then(resp => {
                if (resp.status === 204) {
                    return null
                }
                return resp.json()
            })
            .then(user => {
                if (user) {
                    users.push(user)
                    item = embedUser(user, item)
                    embedded_items.push(item)
                    return finish()
                } else {
                    console.log(`Unable to find user ${item.owner.id} in VAULT.`)
                }
            }).catch(e => {
                console.error(`Error requesting user info for ${item.owner.id}`)
                console.error(e)
                embedded_items.push(item)
                return finish()
            })
    }
}

function finish() {
    if (embedded_items.length === items.length) {
        console.log('Done embedding data in items, overwriting the original file')
        fs.writeFile(items_file, JSON.stringify(items, null, 2), (err) => {
            if (err) {
                console.error(`Error writing ${items_file} file`)
                console.error(err)
            }
        })
    }
}

// we will populate these global objects
let collections = []
let users = []
let items = []
let embedded_items = []
let items_file = options.f || options.file

async function main(items_file) {
    // first get list of collections because we only need to do this once
    collections = await getCollections()
    items = require(`./${items_file}`)
    items.forEach(i => embed(i))
}

if (require.main === module) {
    if (!items_file) {
        console.error('Error: you must provide a JSON files of items with the -f or --file flag.')
        process.exit(1)
    }
    main(items_file)
}
