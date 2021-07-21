/*jshint esversion: 6, node: true */
const fs = require('fs')
const path = require('path')

const request = require('request')
const xpath = require('xpath')
const xmldom = require('xmldom').DOMParser
const async = require('async')
const options = require('rc')('facfiles')
const LENGTH = 50

const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}

// query string parameters for API, see apidocs.do
let params = {
    collections: options.collection_uuid,
    info: 'metadata,attachment',
    // maximum no. of items we can get in an API request
    length: LENGTH,
    q: options.name
}

let baseRequest = request.defaults({ headers: headers, json: true })
let searchRequest = baseRequest.defaults({ qs: params })

let total = 0
let count = 0
let items = []

// determine if a semester falls within the start/stop term parameters
function inTimeRange(semester) {
    let num = termToNumber(semester)
    return (num >= start && num <= stop)
}
// map semester to number e.g. Fall 2020 => 2020.8, Spring 2019 => 2019.2
function termToNumber(semester) {
    const map = { 'spring': 0.2, 'summer': 0.5, 'fall': 0.8 }
    let year = parseInt(semester.match(/\d{4}/)[0])
    let season = semester.match(/([a-z]+) /i)[1].toLowerCase()
    return year + map[season]
}
// cache values of these rather than lookup every time
let start = options.start_term ? termToNumber(options.start_term) : 0
let stop = options.stop_term ? termToNumber(options.stop_term) : Infinity

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
searchRequest.get(`${options.url}/api/search/`, (err, response, data) => {
    if (err) throw err

    collectItems(null, null, data)
    console.log(`${total} total syllabi for ${options.name}`)
    // these requests fire off in parallel
    while (count < total) {
        console.log(`Getting syllabi items ${count + 1} through ${count + LENGTH}...`)
        count += LENGTH
        searchRequest.get(`${options.url}/api/search/`, { qs: { start: items.length } }, collectItems)
    }
})

function downloadFiles (items) {
    console.log('Downloading files (this may take a minute).')
    async.each(items, getFile)
}

function getFile (item, callback) {
    let xml = new xmldom().parseFromString(item.metadata)
    let semester = xpath.select('string(//local/courseInfo/semester)', xml)
    let faculty = xpath.select('string(//local/courseInfo/faculty)', xml)

    if (inTimeRange(semester) && faculty.match(options.name)) {
        let section = [
            semester,
            xpath.select('string(//local/courseInfo/section)', xml),
            xpath.select('string(//local/courseInfo/course)', xml),
        ].join(' ')
        // handle multiple attachments, add number to filename
        item.attachments.forEach((attachment, index) => {
            let req = baseRequest.get(`${options.url}/api/item/${item.uuid}/${item.version}/file/${attachment.filename}`)
                .on('response', res => {
                    let extension = attachment.filename.split('.').pop()
                    let filename = [section, (index ? ` (${index})` : ''), '.', extension].join('')
                    filename = filename.replace(/[\/\\:]/g, "_")
                    req.pipe(fs.createWriteStream(path.join('files', filename)))
                })
                .on('err', err => {
                    console.error(`Error downloading file ${attachment.filename} from item ${options.url}/items/${item.uuid}/${item.version}/`)
                    console.error(err)
                })
        })
    }
}
