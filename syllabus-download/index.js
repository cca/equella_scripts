/*jshint esversion: 6, node: true */
const request = require('request')
const xpath = require('xpath')
const xmldom = require('xmldom').DOMParser
const async = require('async')
const fs = require('fs')
const path = require('path')

const token = fs.readFileSync('.token').toString().trim()
let headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + token,
}
const root = 'https://vault.cca.edu/api/'
// parameters for filtering
let collections = ['9ec74523-e018-4e01-ab4e-be4dd06cdd68'] // ID for Syllabus Coll
let programs = ['ILLUS']
let years = [2017, 2018, 2019]

let length = 50 // maximum no. of items we can get in an API request
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

// figure out how many syllabi there are & collect them into items array
searchRequest.get(root + 'search/', (err, response, data) => {
    if (err) {
        console.log(`Error with initial syllabus search.`)
        console.log(err)
    }

    total = data.available
    items = items.concat(data.results)
    count += items.length
    console.log(`${total} total syllabi for ${programs.join(', ')}`)
    // handle scenario where there are <50 syllabi & we got them all already
    if (count === total) downloadFiles()

    // these requests will fire off in parallel
    while (count < total) {
        console.log(`Getting syllabi items ${count + 1} through ${count + length}...`)
        searchRequest.get(root + 'search/', { qs: { start: count } },
            (err, response, data) => {
                if (err) {
                    console.log(`Error getting syllabi search results. Count was ${count}.`)
                    console.log(err)
                }
                items = items.concat(data.results)
                // we have all the items so can start downloading
                // use > because it's possible an item was created in the meantime
                if (items.length >= total) downloadFiles()
        })
        count += length
    }
})

function downloadFiles () {
    console.log('Downloading files (this may take a minute).')
    async.each(items, getFile)
}

function getFile (item, callback) {
    let xml = new xmldom().parseFromString(item.metadata)
    let semester = xpath.select('string(//local/courseInfo/semester)', xml)
    let year = parseInt(semester.match(/\d{4}/)[0])
    let section = [
        xpath.select('string(//local/courseInfo/semester)', xml),
        xpath.select('string(//local/courseInfo/section)', xml),
        xpath.select('string(//local/courseInfo/course)', xml),
    ].join(' ')

    if (year && years.includes(year)) {
        // handle multiple attachments, add number to filename
        item.attachments.forEach((attachment, index) => {
            let req = baseRequest.get(`${root}item/${item.uuid}/${item.version}/file/${attachment.filename}`)
                .on('response', res => {
                    let extension = attachment.filename.split('.').pop()
                    let filename = [section, (index ? ` (${index})` : ''), '.', extension].join('')
                    filename = filename.replace(/[\/\\:]/g, "_")
                    req.pipe(fs.createWriteStream(path.join('files', filename)))
                })
                .on('err', err => {
                    console.log(`Error downloading file ${attachment.filename} from item https://vault.cca.edu/items/${item.uuid}/${item.version}/`)
                    console.log(err)
                })
        })
    }
}
