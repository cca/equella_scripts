// usage:
//      node modify --csv input.csv [--debug] [--dryrun]
import fs from 'node:fs'
import { default as fetch, Headers } from 'node-fetch'
import rc from 'rc'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import xpath from 'xpath'
import { default as CSVReader } from 'csv-reader'

let options = rc('metadata-csv', {})

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

const headers = new Headers({
    'X-Authorization': 'access_token=' + options.token,
    'Accept': 'application/json',
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
        console.error('Error: could not find header row. Are you sure the first two columns are "uuid,version" (case insensitive)?')
        process.exit(1)
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
    const url = `${options.root}/item/${item.uuid}/${item.version}/`
    let putHeaders = headers
    putHeaders.append('Content-Type', 'application/json')
    const body = item
    body.metadata = XMLStringify(xml)

    fetch(url, {
        method: 'PUT',
        headers: putHeaders,
        body: JSON.stringify(body), })
        // EQUELLA responds with an empty body on success
        .then(r => {
            if (r.status == 200) return console.log(`Successfully edited item ${url}`)
            // if we're unsuccessful we might have error JSON
            r.json()
        })
        .then(data => {
            if (data && data.error) throw(data)
        }).catch(e => {
            console.error(`Error editing item ${url}`)
            console.error('EQUELLA API Response:')
            console.error(e)
        })
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
        let text = (element ? element.textContent.trim() : null)
        let newValue = changes[xp].trim()
        if (!text) {
            debug(`New field ${xp} = "${newValue}"`)
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
        }
    } else {
        console.log(`No changes to item ${options.root.replace(/api$/, '')}${item.uuid}/${item.version}/`)
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
    for (let i = 2; i < row.length; i++) {
        let xp = row[i]
        if (xp.indexOf('/xml') !== 0 && xp.indexOf('/') === 0) {
            console.error(`ERROR: XPath ${xp} begins with a slash but not "/xml", it won't be found in EQUELLA records. Try either prefixing all metadata columns with "/xml" or removing the leading slash.`)
            process.exit(1)
        }
    }
}

let columns = []

fs.createReadStream(options.csv, 'utf8').pipe(new CSVReader({ trim: true }))
    .on('data', (row)=>  {
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
