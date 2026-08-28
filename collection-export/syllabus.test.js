import assert from 'node:assert'
import {describe, it} from 'mocha'
import xpath from 'xpath'
import {addRoleTerm, convertSyllabusXMLtoMODS} from './syllabus.js'
import {DOMParser} from '@xmldom/xmldom'

// helper function to wrap XML in a root </xml> element
const x = (xml) => `<xml>${xml}</xml>`

describe('addRoleTerm', () => {
    const authority = 'marcrelator'
    const authorityURI = 'http://id.loc.gov/vocabulary/relators'

    it('should add a role/roleTerm element with authority and type attributes', async () => {
        const doc = new DOMParser().parseFromString('<mods></mods>', 'text/xml')
        const valueURI = 'http://id.loc.gov/vocabulary/relators/tch'
        addRoleTerm(doc.documentElement, 'teacher', valueURI)
        const roleTerm = xpath.select1('//mods/role/roleTerm', doc)
        assert.ok(roleTerm)
        assert.strictEqual(roleTerm.textContent, 'teacher')
        assert.strictEqual(roleTerm.getAttribute('authority'), authority)
        assert.strictEqual(roleTerm.getAttribute('authorityURI'), authorityURI)
        assert.strictEqual(roleTerm.getAttribute('valueURI'), valueURI)
    })

    it('should work without a valueURI', async () => {
        const doc = new DOMParser().parseFromString('<mods></mods>', 'text/xml')
        addRoleTerm(doc.documentElement, 'teacher')
        const roleTerm = xpath.select1('//mods/role/roleTerm', doc)
        assert.ok(roleTerm)
        assert.strictEqual(roleTerm.textContent, 'teacher')
        assert.strictEqual(roleTerm.getAttribute('authority'), authority)
        assert.strictEqual(roleTerm.getAttribute('authorityURI'), authorityURI)
    })
})

describe('personalNames', () => {
    it('should add a single personal name from local/faculty elements', async () => {
        const inputXML = x(`<local><courseInfo><faculty>John Doe</faculty></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const nameElement = xpath.select1('//mods/name[@type="personal"]', result)
        assert.ok(nameElement)
        const namePart = xpath.select1('namePart', nameElement)
        assert.ok(namePart)
        assert.strictEqual(namePart.textContent, 'John Doe')
    })

    it('should add multiple personal names from local/faculty elements', async () => {
        const inputXML = x(`<local><courseInfo><faculty>John Doe, Jane Smith</faculty></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const nameElements = xpath.select('//mods/name[@type="personal"]', result)
        assert.strictEqual(nameElements.length, 2)
        const namePart1 = xpath.select1('namePart', nameElements[0])
        assert.ok(namePart1)
        assert.strictEqual(namePart1.textContent, 'John Doe')
        const namePart2 = xpath.select1('namePart', nameElements[1])
        assert.ok(namePart2)
        assert.strictEqual(namePart2.textContent, 'Jane Smith')
    })
})

describe('addIdentifiers', () => {
    it('should add course number and section identifiers', async () => {
        const courseNumber = 'ARTED-101'
        const section = 'ARTED-101-1'
        const inputXML = x(`<local><courseInfo><courseName>${courseNumber}</courseName><section>${section}</section></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const courseIdentifier = xpath.select1('//mods/identifier[@type="course number"]', result)
        assert.ok(courseIdentifier)
        assert.strictEqual(courseIdentifier.textContent, courseNumber)
        const sectionIdentifier = xpath.select1('//mods/identifier[@type="section"]', result)
        assert.ok(sectionIdentifier)
        assert.strictEqual(sectionIdentifier.textContent, section)
    })
})

describe('addSubjects', () => {
    it('should add a temporal subject for semester', async () => {
        const semester = 'Fall 2026'
        const inputXML = x(`<local><courseInfo><semester>${semester}</semester></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const temporal = xpath.select1('//mods/subject/temporal', result)
        assert.ok(temporal)
        assert.strictEqual(temporal.textContent, semester)
    })

    it('should add a topic subject for department', async () => {
        const department = 'Art Education (BFA)'
        const inputXML = x(`<local><department>${department}</department></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const topic = xpath.select1('//mods/subject/topic', result)
        assert.ok(topic)
        assert.strictEqual(topic.textContent, 'Art Education')
    })
})

describe('addGenre', () => {
    it('should add syllabi genre element with authority=aat', async () => {
        const inputXML = x(`<mods></mods>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const genre = xpath.select1('//mods/genre[@authority="aat"]', result)
        assert.ok(genre)
        assert.strictEqual(genre.textContent, 'syllabi')
    })
})

describe('fixSyllabusTitle', () => {
    it('should not retain the original title', async () => {
        const title = 'Fall 2026 | FASHN-360 | Media History'
        const inputXML = x(`<local><courseInfo><course>Test</course></courseInfo></local><mods><titleInfo><title>${title}</title></titleInfo></mods>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const newTitle = xpath.select("string(//mods/titleInfo/title)", result)
        assert.notEqual(newTitle, title)
    })

    it('should have a titleInfo/title with the course title', async () => {
        const title = 'Media History'
        const inputXML = x(`<local><courseInfo><course>${title}</course></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        assert.strictEqual(xpath.select("string(//titleInfo/title)", result), title)
    })

    it('or a titleInfo/title with the course code', async () => {
        const courseCode = 'ARTED-101'
        const inputXML = x(`<local><courseInfo><courseName>${courseCode}</courseName></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        assert.strictEqual(xpath.select("string(//titleInfo/title)", result), courseCode)
    })

    it('should combine courseInfo/course and courseInfo/courseName in the title', async () => {
        const courseName = 'FASHN-360'
        const courseTitle = 'Media History'
        const inputXML = x(`<local><courseInfo><courseName>${courseName}</courseName><course>${courseTitle}</course></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        assert.strictEqual(xpath.select("string(//titleInfo/title)", result), `${courseName} ${courseTitle}`)
    })

    it('should have a titleInfo/partNumber with the semester', async () => {
        const semester = 'Fall 2026'
        const inputXML = x(`<local><courseInfo><course>Title</course><semester>${semester}</semester></courseInfo></local>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        assert.strictEqual(xpath.select("string(//titleInfo/partNumber)", result), semester)
    })
})

describe('convertSyllabusXMLtoMODS', () => {
    it('should include the MODS namespaces & attributes', async () => {
        // <mods> must be non-empty or it is dropped
        const result = convertSyllabusXMLtoMODS(x('<mods><titleInfo><title>Testing</title></titleInfo></mods>'))
        const mods = xpath.select1('//mods', result)
        assert.ok(mods)
        assert.strictEqual(mods.getAttribute('xmlns'), 'http://www.loc.gov/mods/v3')
        assert.strictEqual(mods.getAttribute('version'), '3.8')
    })

    it('should map mods/part/number to part/text @type=attachment-uuid', async () => {
        const partNumber = '12345'
        const inputXML = x(`<mods><part><number>${partNumber}</number></part></mods>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const partText = xpath.select1('//mods/part/text[@type="attachment-uuid"]', result)
        assert.ok(partText)
        assert.strictEqual(partText.textContent, partNumber)
    })

    it('should map multiple mods/part/number to their own mods/part section', async () => {
        const partNumber = '12345'
        const partNumber2 = '67890'
        const inputXML = x(`<mods><part><number>${partNumber}</number><number>${partNumber2}</number></part></mods>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const parts = xpath.select('//mods/part', result)
        assert.strictEqual(parts.length, 1)
        const partText = xpath.select1('//mods/part/text[@type="attachment-uuid"][1]', result)
        assert.ok(partText)
        const partText2 = xpath.select1('//mods/part/text[@type="attachment-uuid"][2]', result)
        assert.ok(partText2)
        assert.strictEqual(partText.textContent, partNumber)
        assert.strictEqual(partText2.textContent, partNumber2)
    })

    it('should throw an error for non-string input', async () => {
        assert.throws(() => convertSyllabusXMLtoMODS(null), /XML input must be a string/)
        assert.throws(() => convertSyllabusXMLtoMODS(123), /XML input must be a string/)
        assert.throws(() => convertSyllabusXMLtoMODS({}), /XML input must be a string/)
    })

    it('should drop empty elements', async () => {
        // Empty elements inside mods should be removed
        const inputXML = x(`<mods><name></name></mods>`)
        const result = convertSyllabusXMLtoMODS(inputXML)
        const nameElements = result.getElementsByTagName('name')
        assert.strictEqual(nameElements.length, 0)
    })
})
