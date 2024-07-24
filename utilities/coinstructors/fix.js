import {readFileSync} from 'fs'

import fetch from 'node-fetch'
import rc from 'rc'
import xpath from 'xpath'
import {DOMParser as xmldom} from '@xmldom/xmldom'

const options = rc('app', { courses: 'data/courses.json' })

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

// courses.forEach -> search() VAULT -> fix (if not dry run)
// ? should we create a new version?
