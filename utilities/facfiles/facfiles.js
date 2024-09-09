import fs  from 'node:fs'
import path  from 'node:path'

import async  from 'async'
import {default as fetch, Headers} from 'node-fetch'
import rc from 'rc'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import xpath  from 'xpath'

const options = rc('facfiles')
const LENGTH = 50
const headers = new Headers({
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
})

if (!options.name) {
    console.error('Please provide a name to search for with the --name flag.')
    process.exit(1)
}

// query string parameters for API, see apidocs.do
const params = new URLSearchParams({
    collections: options.collection_uuid,
    info: 'metadata,attachment',
    // maximum no. of items we can get in an API request
    length: LENGTH,
    q: options.name
})

let total = 0
let count = LENGTH
let items = []

function debug() {
    if (options.debug) console.log(...arguments)
}

// determine if a semester falls within the start/stop term parameters
function inTimeRange(semester) {
    const num = termToNumber(semester)
    return (num >= start && num <= stop)
}
// map semester to number e.g. Fall 2020 => 2020.8, Spring 2019 => 2019.2
function termToNumber(semester) {
    const map = { 'spring': 0.2, 'summer': 0.5, 'fall': 0.8 }
    const year = parseInt(semester.match(/\d{4}/)[0])
    const season = semester.match(/([a-z]+) /i)[1].toLowerCase()
    return year + map[season]
}
// cache values of these rather than lookup every time
const start = options.start_term ? termToNumber(options.start_term) : 0
const stop = options.stop_term ? termToNumber(options.stop_term) : Infinity

// collect items from a request into global array, set total in case it's changed
function collectItems (data) {
    items = items.concat(data.results)
    total = data.available
    console.log(`We have ${items.length} of ${total} total search results for ${options.name}`)
    if (count >= total) downloadFiles(items)
}

// figure out how many syllabi there are & collect them into the items array
function search(start = 0) {
    const url = `${options.root}/api/search/?start=${start}&${params.toString()}`
    debug('Searching', url)
    fetch(url, { headers: headers })
        .then(r => r.json())
        .then(data => {
            collectItems(data)
            // these requests fire off in parallel
            while (count < total) {
                count += LENGTH
                search(items.length)
            }
        })
}

function downloadFiles (items) {
    console.log('Downloading files (this may take a minute).')
    async.each(items, getFile)
}

function getFile (item, callback) {
    const xml = new xmldom().parseFromString(item.metadata, 'text/xml')
    const section_code = xpath.select('string(//local/courseInfo/section)', xml)
    const semester = xpath.select('string(//local/courseInfo/semester)', xml)
    const faculty = xpath.select('string(//local/courseInfo/faculty)', xml)

    if (inTimeRange(semester) && faculty.includes(options.name)) {
        const section = [
            semester,
            section_code,
            xpath.select('string(//local/courseInfo/course)', xml),
        ].join(' ')
        // handle multiple attachments, add number to filename
        item.attachments.forEach((attachment, index) => {
            const url = `${options.root}/api/item/${item.uuid}/${item.version}/file/${encodeURIComponent(attachment.filename)}`
            debug('Downloading', url)
            fetch(url, { headers: headers })
                .then(resp => {
                    if (resp.status != 200) {
                        return console.error(`${resp.status} ${resp.statusText} ERROR: unable to retrieve attachment "${attachment.filename}" for item ${item.links.view}`)
                    }

                    const extension = attachment.filename.split('.').pop()
                    let filename = [section, (index ? ` (${index})` : ''), '.', extension].join('')
                    filename = filename.replace(/[/\\:]/g, "_")
                    resp.body.pipe(fs.createWriteStream(path.join('files', filename)))

                    resp.body.on('err', e => console.error(e))
                })
        })
    }
}

search()
