import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'

import async from 'async'
import { default as fetch, Headers } from 'node-fetch'
import filenamify from 'filenamify'
import rc from 'rc'
import xpath from 'xpath'
import {DOMParser as xmldom} from '@xmldom/xmldom'

const options = rc('equella', { length: 50 })
const headers = new Headers({
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
})
const agent = new https.Agent({
    maxSockets: 10
})
const fetch_options = {
    agent: agent,
    headers: headers,
}
// parameters for filtering
const collections = ['9ec74523-e018-4e01-ab4e-be4dd06cdd68'] // ID for Syllabus Coll
const programs = options.programs ? options.programs.split(',') : []
// the utilities/semesters.js script can generate this list
const semesters = (options.semesters && options.semesters.split(',')) || [
    "Fall 2023",
    "Summer 2023",
    "Spring 2023",
    "Fall 2022",
    "Summer 2022",
    "Spring 2022",
    "Fall 2021",
    "Summer 2021",
    "Spring 2021",
    "Fall 2020",
    "Summer 2020",
    "Spring 2020",
]

// combine multiple programs into one XPath-like "where" clause
let where_clause = ''
for (var i = 0; i < programs.length; i++) {
    where_clause += `/xml/local/courseInfo/department = '${programs[i]}'`
    if (i + 1 !== programs.length) {
        where_clause += ' OR '
    }
}
// query string parameters for API, see apidocs.do
const params = {
    collections: collections.join(','),
    info: 'metadata,attachment',
    length: options.length,
    where: where_clause,
    // if necessary you can limit the number of items to check
    // by adding a freetext query here
    q: options.q || '',
}

let items = []
// collect items from a request into global array, begin downloads if we have them all
function collectItems (data) {
    items = items.concat(data.results)
    if (items.length >= data.available) downloadFiles(items)
}

async function search(start=0) {
    let qs = new URLSearchParams(params)
    qs.append('start', start)
    const url = `${options.root}/api/search/?${qs.toString()}`
    return fetch(url, fetch_options)
        .then(r => r.json())
        .then(data => {
            collectItems(data)
            // if it's the first request (start=0), fire off all the requests we'll need in parallel
            if (start === 0) {
                for (i = options.length; i < data.available; i += options.length) {
                    search(i)
                }
            }
        }).catch(e => {
            console.error(`Search error: ${e}`)
            console.error(`Number of items: ${items.length} | Offset: ${start}`)
        })
}

function downloadFiles (items) {
    console.log(`${items.length} syllabi search results for ${programs.join(', ')}`)
    console.log('Downloading files (this may take a while).')
    async.each(items, getFile)
}

function getFile (item) {
    const xml = new xmldom().parseFromString(item.metadata)
    const semester = xpath.select('string(//local/courseInfo/semester)', xml)

    if (semester && semesters.includes(semester)) {
        const section = [
            semester,
            xpath.select('string(//local/courseInfo/section)', xml),
            xpath.select('string(//local/courseInfo/course)', xml),
        ].join(' ')

        // download file attachments only, though we shouldn't have URLs anyways
        item.attachments.filter(a => a.type === 'file').forEach((attachment, index) => {
            fetch(attachment.links.view, fetch_options)
                .then(resp => {
                    if (resp.status != 200) {
                        throw new Error(`HTTP ${resp.status} ${resp.statusText}\nERROR: unable to retrieve attachment with filename "${attachment.filename}" for item ${options.root}/items/${item.uuid}/${item.version}`)
                    }
                    const extension = attachment.filename.split('.').pop()
                    // handle multiple attachments & special chars
                    let filename = [section, (index ? ` (${index})` : ''), '.', extension].join('')
                    filename = filenamify(filename, { replacement: '_' })
                    resp.body.pipe(fs.createWriteStream(path.join('files', filename)))
                })
                .catch(err => {
                    console.error(err)
                })
        })
    }
}

search()
