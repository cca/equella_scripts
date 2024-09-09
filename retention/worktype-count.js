import fs from 'node:fs'

import { DOMParser as xmldom } from '@xmldom/xmldom'
import xpath from 'xpath'

const file = process.argv[2]
if (!file) {
    console.error("Error: must provide a JSON file of items as the only argument.")
    process.exit(1)
}

const items = JSON.parse(fs.readFileSync(file))
const types = [ "workType", "courseWorkType", "courseWorkTypeSpecific"]
let counts = {}
types.forEach(t => counts[t] = { "(null)": 0 })

items.forEach(item => {
    let xml = new xmldom().parseFromString(item.metadata, 'text/xml')

    types.forEach(type => {
        let value = xpath.select1(`string(//local/courseWorkWrapper/${type})`, xml)
        if (value) {
            if (!counts[type][value]) return counts[type][value] = 1
            return counts[type][value]++
        }
        return counts[type]["(null)"]++
    })
})

console.log(JSON.stringify(counts, null, 2))
