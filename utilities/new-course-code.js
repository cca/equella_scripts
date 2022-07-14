/**
 * create the necessary EQUELLA taxonomies for an entirely new course code
 * e.g. we used this when Comics added an undergraduate degree, COMIX
 *
 * Requires a configured .equellarc file.
 */
const fetch = require('node-fetch')
const opts = require('rc')('equella')
const DEPT = opts._[0]

if (!DEPT || typeof(DEPT) !== 'string' || !DEPT.match(/[A-Z]{5}/)) {
    console.error('Error: you must provide a command-line argument with a five-capital-letter department code like "ANIMA". Usage: node new-course-code ABCDE')
    process.exit(1)
}

const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Authorization': 'access_token=' + opts.token,
}
const url = `${opts.root}/api/taxonomy`
let fetch_opts = { headers: headers, method: 'POST' }

console.log(`Creating course information taxonomies for department code ${DEPT}`);

['COURSE LIST', 'course names', 'course sections', 'course titles', 'faculty'].forEach(name => {
    let taxo = `${DEPT} - ${name}`
    let data = {
        name: taxo,
        readonly: false,
        dataSource: 'internal'
    }
    fetch_opts.body = JSON.stringify(data)
    fetch(url, fetch_opts).then(res => {
        if (res.ok) console.log(`Successfully created taxonomy "${taxo}"`)
        return res.text()
    }).then(text => {
        console.log(text)
    }).catch(err => {
        console.error(`Error creating "${taxo}" taxonomy`)
        console.error(err)
    })
})
