import fs from 'node:fs'
import path from 'node:path'

import fetch from 'node-fetch'
import filenamify from 'filenamify'
import md5 from 'md5-file'
import rc from 'rc'
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'

const defaults = {
    // obviously need attachment & metadata info
    // "basic" is a nicety, gives item.name
    // "detail" gives owner, dates, collaborators, & some other unneeded item properties
    info: 'attachment,basic,detail,metadata',
    length: 50,
}
const options = rc('app', defaults)
const UUIDRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/

if (options.help || options.h || (options._.length && options._[0].match(/^help$/i))) {
    console.log('Usage: node collect.js [options]\n')
    console.log('Options:')
    console.log('  --collection <UUID>  UUID of collection to export')
    console.log('  --item <UUID>        UUID of single item to export')
    console.log('  --verbose            Print debug info')
    console.log('\nYou can also specify any valid EQUELLA search parameters such as "--status DRAFT,ARCHIVE" or "--modifiedBefore 2020-01-01".\nSee https://vault.cca.edu/apidocs.do#operations-tag-Searching')
    process.exit(0)
}

if ((!options.collection || !options.collection.match(UUIDRegex)) && (!options.item || !options.item.match(UUIDRegex))) {
    console.error('Error: must provide either a collection or item UUID.')
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
    const headers = {
        'Accept': 'application/json',
        'X-Authorization': 'access_token=' + options.token,
    }
    opts.headers = headers
    url = new URL(options.root + url)
    return fetch(url, opts)
}

async function search(offset=0) {
    if (options.item) {
        debug(`Exporting individual item with UUID ${options.item} ${options.version ? `and version ${options.version}` : ''}`)
        return http(`/api/item/${options.item}${options.version ? `/${options.version}` : ''}`)
    }
    params.start = offset
    debug(`Searching with offset ${offset}`)
    return http(`/api/search/?${new URLSearchParams(params)}`)
}

// default, create a directory with item's UUID and version
// if --name was passed, create a directory with the item's name
function createItemDir(item, callback, iteration = 0) {
    let postfix = iteration ? ` (${iteration})` : ''
    let dirname = path.join('data', `${item.uuid}-v${item.version}${postfix}`)
    if (options.name) {
        dirname = path.join('data', filenamify(`${item.name}${postfix}`, { replacement: '_' }))
    }

    fs.mkdir(dirname, (err) => {
        if (err) {
            if (err.code === 'EEXIST') {
                debug(`Directory ${dirname} already exists, trying again`)
                return createItemDir(item, callback, iteration + 1)
            } else {
                handleErr(err)
            }
        }
        fs.mkdir(path.join(dirname, 'metadata'), (err) => {
            if (err) handleErr(err)
            callback(dirname)
        })
    })
}

function writeItemDirs(items) {
    console.log('Creating export directories...')
    items.forEach(i => {
        createItemDir(i, dir => {
            getAttachments(i, dir)
            writeXML(i, dir)
            writeJSON(i, dir)
            writeHTML(i, dir)
        })
    })
}

function getAttachments(item, itemDir) {
    debug(`Downloading attachments for item ${item.links.view}`)

    item.attachments.forEach(attachment => {
        // handle non-file attachments https://github.com/cca/equella_scripts/issues/40
        if (['file', 'htmlpage', 'zip'].includes(attachment.type)) {
            // type=zip attachments have a folder property, type=file have a filename property
            // type=htmlpage have a filename like "_mypages/{UUID}/page.html" -> {UUID}.html
            // below we handle filenames with path separators in them that must be preserved
            // these occur in unpacked zip archives, https://github.com/cca/equella_scripts/issues/21
            let filename = path.parse(attachment.filename || attachment.folder)
            filename.encodedBase = encodeURIComponent(filename.base)
            filename.url = filename.dir ? `${filename.dir}/${filename.encodedBase}` : filename.encodedBase
            // zip url/folder property always starts with "_zips/" which we trim off
            filename.full = filenamify(attachment.filename || attachment.folder.replace(/^_zips\//, ''), {replacement: '_'})
            if (attachment.type === 'htmlpage') filename.full = `${attachment.uuid}.html`
            debug(`Downloading "${filename.base}" from item ${item.links.view}`)

            http(`/api/item/${item.uuid}/${item.version}/file/${filename.url}`)
                .then(res => {
                    if (res.status != 200) {
                        return console.error(`${res.status} ${res.statusText} ERROR: unable to retrieve attachment "${filename.base}" for item ${item.links.view}`)
                    }

                    res.body.pipe(fs.createWriteStream(path.join(itemDir, filename.full)))

                    res.body.on('err', handleErr)

                    // check downloaded attachment's md5 hash
                    res.body.on('end', () => {
                        if (attachment.md5) {
                            md5(path.join(itemDir, filename.full)).then(hash => {
                                if (hash === attachment.md5) {
                                    debug(`Attachment "${filename.base}" from item ${item.links.view} finished downloading & has a matching md5sum.`)
                                } else {
                                    console.error(`Error: md5sum mismatch. Attachment "${filename.base}" from item ${item.links.view} finished downloading & md5sum validation failed.\nLocal: ${hash}\tVAULT: ${attachment.md5}`)
                                }
                            }).catch(handleErr)
                        } else {
                            // zip attachments don't have md5sums
                            debug(`No md5sum for attachment "${filename.base}" from item ${item.links.view}`)
                        }
                    })
                })
                .catch('error', e => {
                    console.error(`Error downloading file ${attachment.filename} from item ${item.links.view}`)
                    handleErr(e)
                })
        }
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
    if (text) return `<dt><strong>${label}:</strong></dt>&nbsp;<dd>${escapeHTML(text)}</dd><br>`
    return ''
}

function itemToHTML(item) {
    // create a basic HTML index to the item
    let html = ''
    let xml = new xmldom().parseFromString(item.metadata)

    html += `<html><head><title>${escapeHTML(item.name)} | CCA VAULT</title></head><body>`
    html += `<h1><a href="${item.links.view}">${escapeHTML(item.name)}</a></h1><dl>`

    // TODO this part should be created from a hash in options
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

if (!options.item) debug('Searching for items with these parameters:', params)

search().then(r => r.json())
    .then(data => {
        let total, items;
        if (options.item) {
            total = 1
            items = Array.isArray(data) ? data : [data] // is array if no --version otherwise object
        } else {
            total = data.available > options.length ? options.length : data.available
            items = data.results
            console.log(`Found ${total} search results`)
        }

        // if --item has multiple versions & one wasn't specified we end up with >1 item
        if (items.length >= total) {
            //  all items were in the first "page" of search results
            writeItemDirs(items)
        } else {
            // we need data for the items not in the first page of results
            debug('Iterating through search results pages to get all item data')

            for (let i = data.results.length; i < total; i += options.length) {
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
