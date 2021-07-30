/*jshint esversion: 6, node: true */
const fs = require('fs')
const path = require('path')

const request = require('request')
const xpath = require('xpath')
const xmldom = require('xmldom').DOMParser
const async = require('async')

const token = fs.readFileSync('.token').toString().trim()
const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + token,
}
const root = 'https://vault.cca.edu/api'
// parameters for filtering
const collections = ['9ec74523-e018-4e01-ab4e-be4dd06cdd68'] // ID for Syllabus Coll
const length = 50 // maximum no. of items we can get in an API request
const programs = ['TEXTL']
// the utilities/semesters.js script can generate this list easily
const semesters = [
    "Fall 2019",
    "Summer 2019",
    "Spring 2019",
    "Fall 2018",
    "Summer 2018",
    "Spring 2018",
    "Fall 2017",
    "Summer 2017",
    "Spring 2017",
    "Fall 2016",
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
let params = {
    collections: collections.join(','),
    info: 'metadata,attachment',
    length: length,
    where: where_clause,
}

let baseRequest = request.defaults({ headers: headers, json: true })
let searchRequest = baseRequest.defaults({ qs: params })

let total = 0
let count = 0
let items = []
// collect items from a request into global array, set total in case it's changed
function collectItems (err, resp, data) {
    if (err) {
        console.error(`Error getting syllabi search results. Count was ${items.length}.`)
        throw err
    }
    items = items.concat(data.results)
    total = data.available
    if (count >= total) downloadFiles(items)
}

// figure out how many syllabi there are & collect them into items array
searchRequest.get(`${root}/search/`, (err, response, data) => {
    if (err) throw err

    collectItems(null, null, data)
    console.log(`${total} total syllabi for ${programs.join(', ')}`)
    // these requests will fire off in parallel
    while (count < total) {
        console.log(`Getting syllabi items ${count + 1} through ${count + length}...`)
        count += length
        searchRequest.get(`${root}/search/`, { qs: { start: items.length } }, collectItems)
    }
})

function downloadFiles (items) {
    console.log('Downloading files (this may take a minute).')
    async.each(items, getFile)
}

function getFile (item, callback) {
    let xml = new xmldom().parseFromString(item.metadata)
    let semester = xpath.select('string(//local/courseInfo/semester)', xml)

    if (semester && semesters.includes(semester)) {
        let section = [
            semester,
            xpath.select('string(//local/courseInfo/section)', xml),
            xpath.select('string(//local/courseInfo/course)', xml),
        ].join(' ')
        // handle multiple attachments, add number to filename
        item.attachments.forEach((attachment, index) => {
            let req = baseRequest.get(`${root}/item/${item.uuid}/${item.version}/file/${encodeURIComponent(attachment.filename)}`)
                .on('response', res => {
                    if (res.statusCode != 200) {
                        return console.error(`${res.statusCode} ERROR: unable to retrieve attachment with filename "${attachment.filename}" for item https://vault.cca.edu/item/${item.uuid}/${item.version}`)
                    }
                    let extension = attachment.filename.split('.').pop()
                    let filename = [section, (index ? ` (${index})` : ''), '.', extension].join('')
                    filename = filename.replace(/[/\\:]/g, "_")
                    req.pipe(fs.createWriteStream(path.join('files', filename)))
                })
                .on('error', err => {
                    console.error(`Error downloading file ${attachment.filename} from item https://vault.cca.edu/items/${item.uuid}/${item.version}/`)
                    console.error(err)
                })
        })
    }
}
