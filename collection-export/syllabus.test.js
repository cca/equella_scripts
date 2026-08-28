import assert from 'node:assert'
import {describe, it} from 'mocha'
import xpath from 'xpath'
import {convertSyllabusXMLtoMODS} from './syllabus.js'

// helper function to wrap XML in a root </xml> element
const x = (xml) => `<xml>${xml}</xml>`

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
