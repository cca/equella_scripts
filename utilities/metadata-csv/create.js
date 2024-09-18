// create metadata-only records from a CSV
// usage:
//      node create --csv input.csv --collection $UUID [--draft] [--dryrun]
import fs from 'node:fs'
import https from 'node:https'
import { pathToFileURL } from 'node:url'

import rc from 'rc'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { default as CSVReader } from 'csv-reader'

import { insertNewElement } from './modify.js'

let options = rc('metadata-csv', { 'root': 'https://vault.cca.edu/api' })

const headers = {
    'X-Authorization': 'access_token=' + options.token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}
const httpsAgent = new https.Agent({
    maxSockets: 5
})

function makeXMLDoc(values) {
    let doc = new DOMParser().parseFromString('<xml/>', 'text/xml')
    for (let i = 0; i < values.length; i++) {
        let value = values[i].trim()
        if (value !== "") insertNewElement(doc, columns[i], value)
    }
    return doc
}

function createItem(values) {
    // https://vault.cca.edu/apidocs.do#operations-Items-newItem
    const doc = makeXMLDoc(values)
    const item = {
        metadata: new XMLSerializer().serializeToString(doc),
        collection: {
            uuid: options.collection
        }
    }

    if (options.dryrun) {
        return console.log(`Item that would've been created:\n`, item)
    }

    fetch(`${options.root}/item/?draft=${!!options.draft}`, {
        agent: httpsAgent,
        method: 'POST',
        headers: headers,
        body: JSON.stringify(item),
    }).then(r => {
        // EQUELLA responds with an empty body on success, new item URL is in location header
        if (r.ok) return console.log(`Successfully created item: ${r.headers.get('location')}`)
        // if we're unsuccessful we might have error JSON
        return r.json()
    }).then(data => {
        if (data && data.error) throw (data)
    }).catch(e => {
        console.error('Error editing item', item)
        console.error('EQUELLA API Response:')
        console.error(e)
    })
}

let columns = null
const main = () => {
    fs.createReadStream(options.csv, 'utf8').pipe(new CSVReader({ trim: true }))
        .on('data', (row) => {
            if (!columns) {
                columns = row
                columns.every(c => {
                    if (c.indexOf('/xml/') !== 0) {
                        console.error(`Error: column "${c}" does not begin with "/xml/". All column headers in the CSV must be fully-specified XPath expressions.`)
                        process.exit(1)
                    }
                })
            } else {
                createItem(row)
            }
        })
}

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    // usage info
    if (options.h || options.help) {
        console.log('Usage:\n\tnode create --csv input.csv [--draft] [--dryrun]\n')
        console.log('Create metadata-only records based on a CSV of metadata. The CSV must have a header row of XPaths (e.g. "/xml/mods/abstract"). You must use full paths that start with "/xml/".')
        console.log('\nOptions:')
        console.log('\t--csv:'.padEnd(12) + ' spreadsheet of items to create')
        console.log('\t--collection'.padEnd(12) + ' UUID of the collection for the items')
        console.log('\t--draft:'.padEnd(12) + ' create items in draft state')
        console.log('\t--dryrun:'.padEnd(12) + ' do not modify records, but print XML documents')
        process.exit(0)
    }

    const uuid_regex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
    if (!options.collection || !options.collection.match(uuid_regex)) {
        console.error('Error: must supply a collection UUID with the --collection flag.')
        process.exit(1)
    }

    if (options.dryrun) console.log('Dry run: no records will be modified.')
    main()
}
