import assert from 'node:assert'
import {describe, it} from 'mocha'
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import { convertSyllabusXMLtoMODS } from './syllabus.js'

describe('convertSyllabusXMLtoMODS', () => {
    it('should include the MODS namespaces & attributes', async () => {
        const result = convertSyllabusXMLtoMODS('<xml></xml>')
        const doc = new xmldom().parseFromString(result.toString(), 'text/xml')
        const mods = doc.documentElement
        assert.strictEqual(mods.getAttribute('xmlns'), 'http://www.loc.gov/mods/v3')
        assert.strictEqual(mods.getAttribute('version'), '3.8')
    })

    it('should drop empty elements', async () => {
        // local courseInfo
        const inputXML = `<local><courseInfo><faculty></faculty></courseInfo></local>`
        const result = convertSyllabusXMLtoMODS(inputXML)
        assert.ok(!result.includes("faculty"))
        // MODS
        const inputXML2 = `<mods><name></name></mods>`
        const result2 = convertSyllabusXMLtoMODS(inputXML2)
        assert.ok(!result2.includes("name"))
    })
})
