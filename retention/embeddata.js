/**
 * look up collection and user information for an item
 * adds the collection name to the item's JSON
 * and adds user information to the `owner` field if it's found
 * then overwrites the original JSON file
 */
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

import rc from 'rc'

import {debug, default as log} from './log.js'

let options = rc('retention')

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
const dirname = path.dirname(fileURLToPath(import.meta.url))
const collections_file = `${dirname}/data/collections.json`

function writeCollections(data) {
    fs.writeFile(collections_file, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error(`Error writing ${collections_file} file`)
            console.error(err)
        }
        debug(options.debug, `Downloaded collections data & wrote to file ${collections_file}`)
    })
}

// load downloaded collections JSON or, if we don't have it, get it from API
export async function getCollections() {
    let collections = []
    try {
        collections = JSON.parse(fs.readFileSync(collections_file))
        if (collections.length && options.debug) log(`Found collections data in ${collections_file}`)
    } catch (e) {
        debug(options.debug, `No collections data found, downloading from API...`)
        let response = await fetch(`${options.url}/api/collection/?length=500`, fetch_options)
        let data = await response.json()
        collections = data.results
        // write a data file but without blocking
        writeCollections(collections)
    }
    return collections
}

export function embedUser(user, item) {
    Object.keys(user).forEach(key => {
        item.owner[key] = user[key]
    })
    if (user.firstName && user.lastName) item.owner.fullName = `${user.firstName} ${user.lastName}`
    return item
}

async function embed(item) {
    debug(options.debug, `Embedding data in item ${item.uuid}`)

    item.collection.name = collections.find(c => c.uuid === item.collection.uuid).name

    if (item.owner.id == "") return item

    // look in cache for user
    let user = users.find(u => u.id === item.owner.id)
    if (user) {
        debug(options.debug, `Found user ${user.firstName} ${user.lastName} (${item.owner.id}) in cache`)
        return embedUser(user, item)
    }

    debug(options.debug, `No user found in cache for ${item.owner.id}`)
    // get user data from API and cache it in the users object
    let url = `${options.url}/api/userquery/search?q=${item.owner.id}&groups=false&roles=false`
    let uuid_regex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
    // for internal users
    if (item.owner.id.match(uuid_regex)) {
        url = `${options.url}/api/usermanagement/local/user/${item.owner.id}`
    }

    let response
    try {
        response = await fetch(url, fetch_options)
    } catch(e) {
        console.error(`Error fetching user data for ${item.owner.id}`)
        console.error(e)
        return item
    }

    if (response.status === 204 || response.status === 404) {
        log(`No user found for ${item.owner.id}`)
        // cache the empty response
        users.push({ id: item.owner.id })
        return item
    }

    let data = await response.json()
    if (data && Array.isArray(data?.users)) {
        user = data.users.find(u => u.id === item.owner.id)
        // if a user was deleted they won't be in the array
        if (user) {
            debug(options.debug, `Found user ${user.firstName} ${user.lastName} (${item.owner.id})`)
            users.push(user)
            return embedUser(user, item)
        }
        debug(options.debug, `Unable to find user ${item.owner.id}`)
    } else if (data && data?.id) {
        // internal user
        delete data.links
        users.push(data)
        return embedUser(data, item)
    }

    return item
}

// we will populate these global objects
let collections = []
let users = []
let items_file = options.f || options.file

async function main(items_file) {
    let items = JSON.parse(fs.readFileSync(`./${items_file}`))
    // we want a chunked items file of nested arrays
    if (!items.every(Array.isArray)) {
        console.error('Error: items file must be an array of arrays. Did you forget to run chunk.js first?')
        process.exit(1)
    }
    collections = await getCollections()

    let chunks = items.length
    let embedded = Array.from({length: chunks}, () => []);
    for (let i = 0; i < chunks; i++) {
        for (let item of items[i]) {
            let embedded_item = await embed(item)
            embedded[i].push(embedded_item)
        }
    }
    const fn = items_file.replace(/\.json$/, '-embedded.json')
    log(`Done embedding data in items, writing to ${fn}`)
    fs.writeFile(fn, JSON.stringify(items, null, 2), (err) => {
        if (err) {
            console.error(`Error writing ${items_file} file`)
            console.error(err)
        }
    })
}

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    if (!items_file) {
        console.error('Error: you must provide a JSON files of items with the -f or --file flag.')
        process.exit(1)
    }
    main(items_file)
}
