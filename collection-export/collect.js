const fs = require('fs')
const https = require('https')
const path = require('path')

const fetch = require('node-fetch')
const filenamify = require('filenamify')
const xpath = require('xpath')
const xmldom = require('@xmldom/xmldom').DOMParser
const defaults = {
    // obviously need attachment & metadata info
    // "basic" is a nicety, gives item.name
    // "detail" gives owner, dates, collaborators, & some other unneeded item properties
    info: 'attachment,basic,detail,metadata',
    length: 50,
}
const options = require('rc')('app', defaults)
const UUIDRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/

if (!options.collection || !options.collection.match(UUIDRegex)) {
    console.error('Error: must provide a collection UUID.')
    process.exit(1)
}

// query string parameters for API, mostly defined in rc options, see apidocs.do
let params = {
    collections: options.collection,
    info: options.info,
    // maximum no. of items we can get in an API request
    length: options.length,
};

// more search params which we omit rather than supplying a default value
[
    'modifiedAfter', // ISO dates, YYYY-MM-DD
    'modifiedBefore',
    'order', // relevance, modified, name, rating
    'owner',
    'reverse',
    'showall',
    'status', // DRAFT, LIVE, REJECTED, MODERATING, ARCHIVED, SUSPENDED, DELETED, REVIEW, PERSONAL
    'where',
    'q',
].forEach(prop => {
    if (options[prop]) params[prop] = options[prop]
})

function debug() {
    if (options.debug || options.verbose) console.log(...arguments)
}

function handleErr(e) { if (e) console.error(e) }

// fetch abstraction
async function http(url, opts={}) {
    // specify an HTTP agent so we can set maxSockets to < Infinity
    const agent = new https.Agent({
        keepAlive: true,
        maxSockets: 10
    })
    const headers = {
        'Accept': 'application/json',
        'X-Authorization': 'access_token=' + options.token,
    }
    opts.agent = agent
    opts.headers = headers
    url = new URL(options.root + url)
    return fetch(url, opts)
}

async function search(offset=0) {
    params.start = offset
    debug(`Searching with offset ${offset}`)
    return http(`/api/search/?${new URLSearchParams(params)}`)
}

// default, create a directory with item's UUID and version
// if --name was passed, create a directory with the item's name
function createItemDir(item, callback) {
    let dirname = path.join('data', `${item.uuid}-v${item.version}`)
    if (options.name) {
        dirname =  filenamify.path('data' + path.sep + item.name)
    }
    // @TODO handle potential collisions with --name option
    fs.mkdir(dirname, (err) => {
        if (err) handleErr(err)
        fs.mkdir(path.join(dirname, 'metadata'), (err) => {
            if (err) handleErr(err)
            callback(dirname)
        })
    })
}

function writeItemDirs(items) {
    console.log('Creating export directories for items...')
    items.forEach(i => {
        createItemDir(i, dir => {
            getAttachments(i, dir)
            writeXML(i, dir)
            writeJSON(i, dir)
            writeHTML(i, dir)
        })
    })
}

function getAttachments(item, dir) {
    debug(`Downloading attachments for item ${item.links.view}`)

    item.attachments.forEach(attachment => {
        debug(`Downloading "${attachment.filename}" from item ${item.links.view}`)

        http(`/api/item/${item.uuid}/${item.version}/file/${encodeURIComponent(attachment.filename)}`)
            .then(res => {
                if (res.status != 200) {
                    return console.error(`${res.status} ${res.statusText} ERROR: unable to retrieve attachment with filename "${attachment.filename}" for item ${item.links.view}`)
                }

                let fn = filenamify(attachment.filename, {replacement: '_'})
                res.body.pipe(fs.createWriteStream(path.join(dir, fn)))
            })
            .catch('error', e => {
                console.error(`Error downloading file ${attachment.filename} from item ${item.links.view}`)
                handleErr(e)
            })
    })
}

function writeXML(item, dir) {
    debug(`Writing XML metadata for item ${item.links.view}`)
    fs.writeFile(path.join(dir, 'metadata', 'metadata.xml'), item.metadata, handleErr)
}

function writeJSON(item, dir) {
    debug(`Writing JSON data for item ${item.links.view}`)
    fs.writeFile(path.join(dir, 'metadata', 'item.json'), JSON.stringify(item, null, 2), handleErr)
}

function escapeHTML(s) {
    return s.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    }[tag]))
}

function labelIfExists(label, xp, xml) {
    let text = xpath.select(`string(${xp})`, xml)
    if (text) return `<dt><b>${label}</b></dt><dd>${escapeHTML(text)}</dd>`
    return ''
}

function itemToHTML(item) {
    // create a basic HTML index to the item
    let html = ''
    let xml = new xmldom().parseFromString(item.metadata)

    html += `<html><head><title>${escapeHTML(item.name)} | CCA VAULT</title></head><body>`
    html += `<h1><a href="${item.links.view}">${escapeHTML(item.name)}</a></h1><dl>`

    // @TODO this part should be created from a hash in options
    html += labelIfExists('Creator(s)', '//mods/name/namePart', xml)
    html += labelIfExists('Date', '//mods/dateCreatedWrapper/dateCreated', xml)
    html += labelIfExists('Type', '//local/courseWorkWrapper/courseWorkType', xml)

    let abstract = xpath.select('string(//mods/abstract)', xml)
    if (abstract) html += `<dt><b>Description</b></dt><dd><pre>${abstract}</pre></dd>`
    html += '</dl></body></html>'
    return html
}

function writeHTML(item, dir) {
    debug(`Writing HTML info for item ${item.links.view}`)
    fs.writeFile(path.join(dir, 'metadata', 'index.html'), itemToHTML(item), handleErr)
}

debug('Searching for items with these parameters:', params)

search().then(r => r.json())
    .then(data => {
        let total = data.available
        let items = data.results
        console.log(`Found ${total} search results`)

        if (total === items.length) {
            //  all items were in the first "page" of search results
            writeItemDirs(items)
        } else {
            // we need data for the items not in the first page of results
            debug('Iterating through search results pages to get all item data')

            for (var i = data.results.length; i < total; i += options.length) {
                search(i).then(r => r.json())
                    .then(data => {
                        items = items.concat(data.results)
                        debug(`We have data for ${items.length} of ${total} total items`)

                        if (items.length === total) {
                            // we've got all the items data, now create their export dirs
                            debug('We have data for all items now')
                            writeItemDirs(items)
                        }
                    }).catch(handleErr)
            }
        }
    }).catch(handleErr)
