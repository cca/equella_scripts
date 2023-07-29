// usage:
//      node modify --csv input.csv [--debug]
// input.csv must have a header row and the first column must be the UUID
// and the second column is the item version
import fs from 'node:fs'
import { default as fetch, Headers } from 'node-fetch'
import rc from 'rc'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import xpath from 'xpath'
import { default as CSVReader } from 'csv-reader'

let options = rc('metadata-csv', {})

const headers = new Headers({
    'X-Authorization': 'access_token=' + options.token,
    'Accept': 'application/json',
})

// log messages only when debug=true
function debug(msg) {
    if (options.debug) console.error(msg)
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

function modifyItem(item, changes ) {
    let xml = new xmldom().parseFromString(item.metadata)
    let paths = Object.keys(changes)
    paths.splice(0, 2)
    // @TODO how to find and modify XML nodes from the paths?
    // can xpath help here?
    console.log(paths)
    // start with for path of paths look up & print path value vs. changed value
}

function getItem(item) {
    const url = `https://vault.cca.edu/api/item/${item.uuid}/${item.version}`
    fetch(url, { headers: headers })
        .then(r => r.json())
        .then(data => {
            // how EQUELLA does API errors
            if (data.error) throw(data)
            modifyItem(data, item)
        }).catch(e => {
            console.error(`Error fetching item ${url}`)
            console.error('EQUELLA API Response:')
            console.error(e)
        })
}

let columns = []
const inputStream = fs.createReadStream(options.csv, 'utf8')

inputStream.pipe(new CSVReader({ trim: true }))
    .on('data', (row)=>  {
        if (row[0].toLowerCase() === 'uuid' && row[1].toLowerCase() === 'version') {
            columns = row
            debug(`CSV columns are ${columns.join(', ')}`)
            return
        } else {
            let changes = makeChangesHash(columns, row)
            getItem(changes)
        }
    })
    .on('end', () => {
        debug('Finished reading rows from CSV')
    })
