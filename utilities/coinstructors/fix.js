import {readFileSync} from 'fs'

import fetch from 'node-fetch'
import rc from 'rc'
import xpath from 'xpath'
import {DOMParser as xmldom} from '@xmldom/xmldom'

const options = rc('app', {
    collection: '9ec74523-e018-4e01-ab4e-be4dd06cdd68', // Syllabus Collection UUID
    courses: 'data/courses.json',
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
};

// more search params which we omit rather than supplying a default value
[
    'modifiedAfter', // ISO dates, YYYY-MM-DD
    'modifiedBefore',
    'order', // relevance, modified, name, rating
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
    // TODO I think we need to use a --where XPath and not a query string
    // "Fall 2020 IXDSN-2100-2"
    const query = encodeURIComponent(`${termCodeToText(course.term)} ${course.section_code}`)
    const url = `/api/search?${new URLSearchParams(searchParams)}&q=${query}`
    return http(url)
}

courses.forEach(course => {
    const courseText = `${termCodeToText(course.term)} ${course.section_code}`

    search(course)
        .then(res => res.json())
        .then(json => {
            if (json.available === 0) {
                // TODO would be good to create a list of these missing syllabi
                return debug(`No results found for ${courseText}`)
            }
            const items = json.results
            // find (first) result course that exactly matches course (there could be multiple)
            const item = items.find(c => {
                const xml = new xmldom().parseFromString(c.metadata)
                const ci = (xp) => `//local/courseInfo/${xp}`
                const section_code = xpath.select(`string(${ci('section')})`, xml)
                const semester = xpath.select(`string(${ci('semester')})`, xml)
                return section_code === course.section_code && semester === termCodeToText(course.term)
            })
            if (!item) {
                return debug(`No exact match found for ${courseText}`)
            }
            debug(`${item.links.view} is the syllabus for ${courseText}`)
            // TODO fix(course, item)
        })
        .catch(err => {
            console.error(err)
        })
})
