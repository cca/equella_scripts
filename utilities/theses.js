#!/usr/bin/env node
// Using spreadsheet CSV look up capstone/thesis items in VAULT collections
// and write a summary to stdout and the results back to another CSV
// https://docs.google.com/spreadsheets/d/14t4SRtXy_Y3vRs8JYyxzOIUb-YPrYjcPJYnXbgELdas/edit?gid=1935440201#gid=1935440201
import fs from 'node:fs'
import csv from 'csv-parser'
import { stringify } from 'csv-stringify/sync'
import rc from 'rc'

const defaults = {
    endpoint: 'search',
    length: 50, // max length in EQUELLA API
    method: 'get',
}
const options = rc('equella', defaults)

// CLI argument validation
if (options._.length !== 1) {
    console.error("ERROR: must pass CSV file as first & only argument to command")
    process.exit(1)
}
if (options._.length && ["-h", "--help", "help"].includes(options._[0])) {
    console.log("Usage: node utilities/theses.js spreadsheet.csv")
    console.log("Look up theses/capstone projects in VAULT.")
    process.exit(0)
}
const inputCsvPath = options._[0]
try {
    fs.accessSync(inputCsvPath, fs.constants.R_OK)
} catch (err) {
    console.error("ERROR: unable to read CSV file at path " + inputCsvPath)
    process.exit(1)
}

// Main body of program
// Header row
const results = [["Collection","Collection UUID","Item Name","Item UUID","Version","URL"]]
const summary = {}
const dbg = (...args) => { if (options.debug) console.debug(...args) }
const ensureXMLPrefix = (s) => s.startsWith('/xml') ? s : `/xml${s}`
const fetchTheses = async (params) => {
    const query = new URLSearchParams({
        collections: params.collections,
        length: params.length,
        start: params.start,
        where: ensureXMLPrefix(params.where),
    })
    const url = `${options.root}/api/search/?${query}`

    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-Authorization': `access_token=${options.token}`,
        },
    })

    if (!response.ok) throw new Error(`VAULT returned HTTP ${response.status}`)
    dbg('HTTP',response.status, url)

    const data = await response.json()
    data.results.forEach(item => results.push([
        params.name,
        params.collections,
        item.name,
        item.uuid,
        item.version,
        `${options.root}/item/${item.uuid}/${item.version}`,
    ]))
    return data
}

for await (const row of fs.createReadStream(inputCsvPath).pipe(csv())) {
    // skip rows where we do not have a real filter
    if (!row.Filter.startsWith('/')) continue

    const data = await fetchTheses({
        name: row.Collection,
        collections: row.UUID,
        length: options.length,
        start: 0,
        where: ensureXMLPrefix(row.Filter),
    })
    summary[row.Collection] = data.available

    // page through results if there are more than the initial length
    let start = options.length
    while (start < data.available) {
        const nextPage = await fetchTheses({
            name: row.Collection,
            collections: row.UUID,
            length: options.length,
            start: start,
            where: ensureXMLPrefix(row.Filter),
        })
        start += options.length
    }
}

fs.writeFileSync('theses.csv', stringify(results))
console.log(`Collected ${results.length - 1} thesis items in theses.csv.`)
// print table with correct padding etc.
const collectionNames = Object.keys(summary)
const padLength = Math.max(...collectionNames.map(name => name.length)) + 1
console.log("Collection".padEnd(padLength), "Theses")
for (const name of collectionNames) {
    console.log(name.padEnd(padLength), summary[name])
}
