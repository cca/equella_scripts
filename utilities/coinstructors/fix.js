import {readFileSync, appendFile} from 'fs'

import fetch from 'node-fetch'
import rc from 'rc'
import xpath from 'xpath'
import {DOMParser as xmldom} from '@xmldom/xmldom'

const options = rc('app', {
    collection: '9ec74523-e018-4e01-ab4e-be4dd06cdd68', // Syllabus Collection UUID
    courses: 'data/courses.json',
    order: 'modified', // relevance, modified, name, rating
    info: 'all', // I think we need "all" info when we're going to update the item
    length: 50,
})

function debug() {
    if (options.debug || options.verbose) console.log(...arguments)
}

if (options.dryrun) {
    console.log('Dry run enabled, no changes will be made')
}

// read course data from JSON file
let courses = JSON.parse(readFileSync(options.courses, 'utf8'))

// we only care about courses with multiple instructors
debug(`${courses.length} courses loaded`)
courses = courses.filter(course => course.instructors.length > 1)
debug(`${courses.length} courses with multiple instructors`)

if (options.limit) {
    console.log(`Limiting to the first ${options.limit} courses`)
    courses = courses.slice(0, options.limit)
}

/**
 * Translate Workday "AP_" style term references to human-friendly VAULT text.
 * @param {string} term - "AP_Fall_2020"
 * @returns {string} - "Fall 2020"
 */
function termCodeToText(term) {
    return term.replace(/^AP_/, '').replace(/_/g, ' ')
}

/**
 * Unique identifier for a course ("TERM SECTION_CODE").
 * @param {Object} course - Workday course object
 * @returns {string} - "Fall 2020 IXDSN-2100-2"
 */
function courseText(course) {
    return `${termCodeToText(course.term)} ${course.section_code}`
}

// fetch abstraction
async function http(url, opts = {}) {
    const headers = {
        'Accept': 'application/json',
        'X-Authorization': 'access_token=' + options.token,
    }
    opts.headers = opts.headers ? opts.headers : headers
    url = new URL(options.root + url)
    return fetch(url, opts)
}

let searchParams = {
    collections: options.collection,
    info: options.info,
    length: options.length,
    order: options.order,
};

// more search params which we omit rather than supplying a default value
[
    'modifiedAfter', // ISO dates, YYYY-MM-DD
    'modifiedBefore',
    'owner',
    'reverse',
    'showall',
    'status', // DRAFT, LIVE, REJECTED, MODERATING, ARCHIVED, SUSPENDED, DELETED, REVIEW, PERSONAL
    'where',
].forEach(prop => {
    if (options[prop]) searchParams[prop] = options[prop]
})

/**
 * Search for course in VAULT.
 * @param {Object} course - course object from Workday JSON
 * @returns {Promise<Response>} - fetch Promise
 */
function search(course) {
    // semester = "Fall 2020" & section = "IXDSN-2100-2"
    const where = encodeURIComponent(`/xml/local/courseInfo/semester = '${termCodeToText(course.term)}' AND /xml/local/courseInfo/section = '${course.section_code}'`)
    const url = `/api/search?${new URLSearchParams(searchParams)}&where=${where}`
    return http(url)
}

/**
 * Description
 * @param {Object} course - course object from Workday JSON
 * @param {Object} item - item object from VAULT
 * @returns {Promise<Response>} - fetch Promise
 */
function fix(course, item) {
    // much easier to PUT to the same version than create a new version
    // see REST API guide: https://openequella.github.io/guides/RestAPIGuide.html#examples-1
    const url = `/api/item/${item.uuid}/${item.version}`
    let xml = new xmldom().parseFromString(item.metadata, 'text/xml')
    let facultyXML = xpath.select1('/xml/local/courseInfo/faculty', xml)
    let facultyIDXML = xpath.select1('/xml/local/courseInfo/facultyID', xml)
    let facultyString = course.instructors.map(i => `${i.first_name} ${i.last_name}`).join(', ')
    let facultyIDString = course.instructors.map(i => i.username).join(', ')

    if (facultyXML.textContent !== facultyString || facultyIDXML.textContent !== facultyIDString) {
        debug(`Updating faculty details for ${courseText(course)}`)
        debug(`local/courseInfo/faculty: ${facultyXML.textContent} -> ${facultyString}`)
        debug(`local/courseInfo/facultyID: ${facultyIDXML.textContent} -> ${facultyIDString}`)
        // these vars are references to live nodes in the XML
        facultyXML.textContent = facultyString
        facultyIDXML.textContent = facultyIDString
        item.metadata = xml.toString()

        if (options.dryrun) return Promise.resolve()

        const opts = {
            body: JSON.stringify(item),
            headers: {
                'Content-Type': 'application/json',
                'X-Authorization': 'access_token=' + options.token,
            },
            method: 'PUT',
        }
        return http(url, opts)
    }

    debug(`No changes needed for ${courseText(course)}`)
    return Promise.resolve()
}

courses.forEach(course => {
    search(course)
        .then(res => res.json())
        .then(json => {
            if (json.available === 0) {
                debug(`No results found for ${courseText(course)}`)
                // write a CSV in same format as missing syllabi report
                const csvtext = '"' + [
                    termCodeToText(course.term),
                    course.course_code.substr(0, 5),
                    course.course_title,
                    course.instructors.map(i => `${i.first_name} ${i.last_name}`).join(', '),
                    course.section_code,
                ].join('","') + '"\n'
                return appendFile('data/missing-syllabi.csv', csvtext, err => {
                    if (err) console.error(err)
                })
            }
            const items = json.results
            if (!items.length) return debug(`No exact match found for ${courseText(course)}`)
            debug(`${items[0].links.view} is the syllabus for ${courseText(course)}`)
            return fix(course, items[0])
        })
        .catch(err => {
            console.error(err)
        })
})
