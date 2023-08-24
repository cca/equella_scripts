// usage:
//      node modify --csv input.csv [--debug] [--dryrun]
import fs from 'node:fs'
import https from 'node:https'
import { pathToFileURL } from 'node:url'

import { default as fetch } from 'node-fetch'
import rc from 'rc'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import xpath from 'xpath'
import { default as CSVReader } from 'csv-reader'

let options = rc('metadata-csv', { 'root': 'https://vault.cca.edu/api' })

// usage info
if (options.h || options.help) {
    console.log('Usage:\n\tnode modify --csv input.csv [--debug] [--dryrun]\n')
    console.log('Modify records based on a CSV of metadata. The CSV must have a header row, the first column must be the item UUID, and the second column must be the item version. The rest are treaded as metadata columns where the header is the XPath of the field to be modified (e.g. "/xml/mods/abstract"). It is recommended to use full paths that start with "/xml/mods".')
    console.log('\nOptions:')
    console.log('\t--csv:'.padEnd(12) + 'metadata changes spreadsheet')
    console.log('\t--debug:'.padEnd(12) + 'prints a lot more information about what\'s going on')
    console.log('\t--dryrun:'.padEnd(12) + 'do not modify records, but print XML documents')
    process.exit(0)
}

if (options.dryrun) console.log('Dry run: no records will be modified.')

const headers = {
    'X-Authorization': 'access_token=' + options.token,
    'Accept': 'application/json',
}
const httpsAgent = new https.Agent({
    maxSockets: 5
})

// log messages only when debug=true
function debug(msg) {
    if (options.debug) console.error(msg)
}

// shorten this call elsewhere
const xmls = new XMLSerializer()
function XMLStringify(xml) {
    return xmls.serializeToString(xml)
}

// take header row and row of values and turn them into a hash
function makeChangesHash(columns, row) {
    if (columns.length === 0) {
        throw Error('Error: could not find header row. Are you sure the first two columns are "uuid,version" (case insensitive)?')
    }
    let changes = {}
    columns.forEach((col, idx) => {
        // lowercase the uuid and version columns for consistent access later
        if (idx === 0 || idx === 1) col = col.toLowerCase()
        changes[col] = row[idx]
    })
    return changes
}

// PUTs new item metadata to EQUELLA
function applyChanges(item, xml) {
    if (!item.uuid || !item.version) {
        debug('No item UUID or version (probably testing), not applying changes.')
        return null
    }
    const url = `${options.root}/item/${item.uuid}/${item.version}/`
    // ph = headers; ph.append('content-type'...) does not work, ends up with
    // duplicates in putHeader & EQUELLA throws an error
    let putHeaders = { 'Content-Type': 'application/json' }
    putHeaders = Object.assign(headers, putHeaders)
    item.metadata = XMLStringify(xml)

    fetch(url, {
        agent: httpsAgent,
        method: 'PUT',
        headers: putHeaders,
        body: JSON.stringify(item), })
        // EQUELLA responds with an empty body on success
        .then(r => {
            if (r.ok) return console.log(`Successfully edited item ${url}`)
            // if we're unsuccessful we might have error JSON
            return r.json()
        })
        .then(data => {
            if (data && data.error) throw(data)
        }).catch(e => {
            console.error(`Error editing item ${url}`)
            console.error('EQUELLA API Response:')
            console.error(e)
        })
}

/**
 * insert a new element into the provided XML document
 *
 * @param   {Document}  doc    complete XML document
 * @param   {string}  path   Xpath of new element
 * @param   {string}  value  value of new element
 *
 * @return  {Document}         modified XML document
 */
function insertNewElement(doc, path, value) {
    let pathsArray = path.split('/')
    const tagName = pathsArray.pop()
    let parentPath = pathsArray.join('/')
    let parent = xpath.select1(parentPath, doc)

    // this recursively ensures the whole path exists
    if (!parent) insertNewElement(doc, parentPath, '')
    // parent is still undefined
    parent = xpath.select1(parentPath, doc)
    const element = doc.createElement(tagName)
    element.textContent = value
    parent.appendChild(element)
}

// compares existing item metadata & changes, prepares a new XML document if there are changes
// @TODO allow a special "DELETE" value that removes the field
function prepChanges(item, changes) {
    let changed = false // whether we have changes for the record or not
    let xml = new DOMParser().parseFromString(item.metadata)
    let xps = Object.keys(changes)
    xps.splice(0, 2)

    if (options.dryrun) console.log(`${item.uuid}/${item.version} Item Metadata:\n${XMLStringify(xml)}`)

    for (let xp of xps) {
        let element = xpath.select1(xp, xml)
        let text = (element ? element.textContent.trim() : "")
        let newValue = changes[xp].trim()
        // don't add "new" fields that are just empty text nodes
        if (!text && newValue !== "") {
            debug(`New field ${xp} = "${newValue}"`)
            insertNewElement(xml, xp, newValue)
        }
        else if (text === newValue) {
            debug(`No change to ${xp}`)
        } else {
            debug(`Field ${xp} changed from "${text}" to "${newValue}"`)
            element.textContent = newValue
            changed = true
        }
    }

    if (changed) {
        // modify record via API
        if (options.dryrun) {
            console.log(`${item.uuid}/${item.version} Modified XML:\n${XMLStringify(xml)}`)
        } else {
            applyChanges(item, xml)
            return xml
        }
    } else {
        console.log(`No changes to item ${options.root.replace(/api$/, '')}${item.uuid}/${item.version}/`)
        return null
    }
}

// get item information from EQUELLA
function getItem(item) {
    const url = `${options.root}/item/${item.uuid}/${item.version}`
    fetch(url, { headers: headers })
        .then(r => r.json())
        .then(data => {
            // how EQUELLA does API errors
            if (data.error) throw(data)
            prepChanges(data, item)
        }).catch(e => {
            console.error(`Error fetching item ${url}`)
            console.error('EQUELLA API Response:')
            console.error(e)
        })
}

// exit with an error if an xpath looks invalid
function checkPathPrefixes(row) {
    // NOTE: relative "//" xpaths do not make sense when adding a new field,
    // only when deleting or modifying
    for (let i = 2; i < row.length; i++) {
        let xp = row[i]
        if (xp.indexOf('/xml') !== 0 && xp.indexOf('//') !== 0) {
            throw Error(`ERROR: XPath ${xp} is not relative nor does it begin with "/xml", it won't be found in EQUELLA records. Try either prefixing all metadata columns with "/xml" or making it relative with two leading slashes.`)
        }
    }
    return true
}

let columns = []
const main = () => {
    fs.createReadStream(options.csv, 'utf8').pipe(new CSVReader({ trim: true }))
        .on('data', (row) => {
            if (row[0].toLowerCase() === 'uuid' && row[1].toLowerCase() === 'version') {
                columns = row
                debug(`CSV columns are ${columns.join(', ')}`)
                checkPathPrefixes(row)
            } else {
                let changes = makeChangesHash(columns, row)
                getItem(changes)
            }
        })
        .on('end', () => {
            debug('Finished reading rows from CSV')
        })
}

export { checkPathPrefixes, insertNewElement, prepChanges, makeChangesHash }

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    main()
}
