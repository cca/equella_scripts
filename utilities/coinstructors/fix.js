import {readFileSync, appendFile} from 'fs'

import fetch from 'node-fetch'
import rc from 'rc'
import xpath from 'xpath'
import {DOMParser as xmldom} from '@xmldom/xmldom'

const options = rc('app', {
    collection: '9ec74523-e018-4e01-ab4e-be4dd06cdd68', // Syllabus Collection UUID
    courses: 'data/courses.json',
    order: 'modified', // relevance, modified, name, rating
    info: 'basic,metadata',
    length: 50,
})

function debug() {
    if (options.debug || options.verbose) console.log(...arguments)
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

// Outline: courses.forEach -> search() VAULT -> fix (if not dry run)
// ? should we create a new version?

/**
 * Translate Workday "AP_" style term references to human-friendly VAULT text.
 * @param {string} term - "AP_Fall_2020"
 * @returns {string} - "Fall 2020"
 */
function termCodeToText(term) {
    return term.replace(/^AP_/, '').replace(/_/g, ' ')
}

// fetch abstraction
async function http(url, opts = {}) {
    const headers = {
        'Accept': 'application/json',
        'X-Authorization': 'access_token=' + options.token,
    }
    opts.headers = headers
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

courses.forEach(course => {
    const courseText = `${termCodeToText(course.term)} ${course.section_code}`

    search(course)
        .then(res => res.json())
        .then(json => {
            if (json.available === 0) {
                debug(`No results found for ${courseText}`)
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
            if (!items.length) {
                return debug(`No exact match found for ${courseText}`)
            }
            debug(`${items[0].links.view} is the syllabus for ${courseText}`)
            // TODO fix(course, items[0])
        })
        .catch(err => {
            console.error(err)
        })
})
