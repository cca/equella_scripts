import assert from 'node:assert'
import {describe, it} from 'mocha'
import xpath from 'xpath'
import {convertPressClipsXMLtoMODS} from './pressclips.js'

// helper function to wrap XML in a root <xml> element
const x = (xml) => `<xml>${xml}</xml>`

describe('convertPressClipsXMLtoMODS', () => {
    describe('input validation', () => {
        it('should throw an error for non-string input', () => {
            assert.throws(() => convertPressClipsXMLtoMODS(null), /XML input must be a string/)
            assert.throws(() => convertPressClipsXMLtoMODS(undefined), /XML input must be a string/)
            assert.throws(() => convertPressClipsXMLtoMODS(42), /XML input must be a string/)
            assert.throws(() => convertPressClipsXMLtoMODS({}), /XML input must be a string/)
        })

        it('should throw an error for empty string input', () => {
            assert.throws(() => convertPressClipsXMLtoMODS(''), /XML input cannot be empty/)
            assert.throws(() => convertPressClipsXMLtoMODS('   '), /XML input cannot be empty/)
        })

        it('should throw an error for malformed XML', () => {
            assert.throws(() => convertPressClipsXMLtoMODS(x('<mods><unclosed></mods>')), /Failed to parse XML/)
        })
    })

    describe('MODS setup', () => {
        it('should include the MODS namespace & attributes', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods></mods>'))
            assert.strictEqual(result.nodeName, 'mods')
            assert.strictEqual(result.getAttribute('xmlns'), 'http://www.loc.gov/mods/v3')
            assert.strictEqual(result.getAttribute('version'), '3.8')
            assert.strictEqual(result.getAttribute('xmlns:xsi'), 'http://www.w3.org/2001/XMLSchema-instance')
        })

        it('should make <mods> the new root element & drop the /local branch', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods></mods><local><foo>bar</foo></local>'))
            assert.strictEqual(result.nodeName, 'mods')
            assert.strictEqual(result.ownerDocument.documentElement, result)
            assert.strictEqual(xpath.select1('//local', result.ownerDocument), undefined)
        })
    })

    describe('typeOfResource', () => {
        it('should add typeOfResource = text', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods></mods>'))
            const typeOfResource = xpath.select1('typeOfResource', result)
            assert.ok(typeOfResource)
            assert.strictEqual(typeOfResource.textContent, 'text')
        })
    })

    describe('genre', () => {
        it('should add genre = Periodicals w/ authority attributes', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods></mods>'))
            const genre = xpath.select1('genre', result)
            assert.ok(genre)
            assert.strictEqual(genre.textContent, 'Periodicals')
            assert.strictEqual(genre.getAttribute('authority'), 'marcgt')
            assert.strictEqual(genre.getAttribute('authorityURI'), 'http://id.loc.gov/authorities/genreForms')
            assert.strictEqual(genre.getAttribute('valueURI'), 'http://id.loc.gov/authorities/genreForms/gf2014026139')
        })
    })

    describe('part/number conversion', () => {
        it('should convert a single mods/part/number to part/text @type=attachment-uuid', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods><part><number>abc-123</number></part></mods>'))
            const text = xpath.select1('part/text', result)
            assert.ok(text)
            assert.strictEqual(text.getAttribute('type'), 'attachment-uuid')
            assert.strictEqual(text.textContent, 'abc-123')
            assert.strictEqual(xpath.select1('part/number', result), undefined)
        })

        it('should move multiple mods/part/number values to their own mods/part section', () => {
            const result = convertPressClipsXMLtoMODS(x(`<mods>
                <part><detail type="title"><caption>Article Title</caption></detail><number>uuid-1</number><number>uuid-2</number></part>
            </mods>`))
            const parts = xpath.select('part', result)
            assert.strictEqual(parts.length, 2)
            // first part keeps its detail, and no numbers/text
            assert.ok(xpath.select1('detail', parts[0]))
            assert.strictEqual(xpath.select('number', parts[0]).length, 0)
            assert.strictEqual(xpath.select('text', parts[0]).length, 0)
            // second (new) part has both UUIDs and nothing else
            const uuidTexts = xpath.select('text', parts[1])
            assert.strictEqual(uuidTexts.length, 2)
            assert.strictEqual(uuidTexts[0].textContent, 'uuid-1')
            assert.strictEqual(uuidTexts[1].textContent, 'uuid-2')
        })
    })

    describe('dateCreated unwrapping', () => {
        // note: xpath.select()/select1() match element names case-insensitively here (no namespace
        // resolver is configured), so origininfo/originInfo cannot be distinguished via xpath alone;
        // we assert the exact case via node.nodeName instead.
        it('should unwrap origininfo/dateCreatedWrapper/dateCreated to originInfo/dateCreated w/ w3cdtf encoding', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods><origininfo><dateCreatedWrapper><dateCreated>2020-01-01</dateCreated></dateCreatedWrapper></origininfo></mods>'))
            const originInfo = xpath.select1('originInfo', result)
            assert.ok(originInfo)
            assert.strictEqual(originInfo.nodeName, 'originInfo')
            const dateCreated = xpath.select1('dateCreated', originInfo)
            assert.ok(dateCreated)
            assert.strictEqual(dateCreated.textContent, '2020-01-01')
            assert.strictEqual(dateCreated.getAttribute('encoding'), 'w3cdtf')
        })

        it('should not add w3cdtf encoding if dateCreated has no direct text content', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods><origininfo><publisher>Foo</publisher></origininfo></mods>'))
            const originInfo = xpath.select1('originInfo', result)
            assert.ok(originInfo)
            assert.strictEqual(xpath.select1('dateCreated', originInfo), undefined)
        })

        it('should rename origininfo to originInfo even without a dateCreatedWrapper', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods><origininfo><publisher>Foo</publisher></origininfo></mods>'))
            const originInfo = xpath.select1('originInfo', result)
            assert.ok(originInfo)
            assert.strictEqual(originInfo.nodeName, 'originInfo')
            assert.strictEqual(xpath.select1('publisher', originInfo).textContent, 'Foo')
        })
    })

    describe('name role/type', () => {
        it('should add an author role & type=personal to the first mods/name', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods><name><namePart>Jane Doe</namePart></name></mods>'))
            const name = xpath.select1('name', result)
            assert.strictEqual(name.getAttribute('type'), 'personal')
            const roleTerm = xpath.select1('role/roleTerm', name)
            assert.ok(roleTerm)
            assert.strictEqual(roleTerm.textContent, 'author')
            assert.strictEqual(roleTerm.getAttribute('valueURI'), 'http://id.loc.gov/vocabulary/relators/aut')
        })


        it('should not throw or add a role if no mods/name is present', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods></mods>'))
            assert.strictEqual(xpath.select('name', result).length, 0)
        })
    })

    describe('empty element removal', () => {
        it('should remove empty elements after conversion', () => {
            const result = convertPressClipsXMLtoMODS(x('<mods><note></note><abstract>   </abstract></mods>'))
            assert.strictEqual(xpath.select1('note', result), undefined)
            assert.strictEqual(xpath.select1('abstract', result), undefined)
        })
    })

    describe('full conversion', () => {
        it('should apply all conversions together for a representative item', () => {
            const input = x(`<mods>
                <name><namePart>Jane Doe</namePart></name>
                <origininfo><dateCreatedWrapper><dateCreated>2019-05-04</dateCreated></dateCreatedWrapper></origininfo>
                <part><number>uuid-only</number></part>
            </mods>`)
            const result = convertPressClipsXMLtoMODS(input)

            assert.strictEqual(result.nodeName, 'mods')
            assert.strictEqual(xpath.select1('typeOfResource', result).textContent, 'text')
            assert.strictEqual(xpath.select1('genre', result).textContent, 'Periodicals')

            const name = xpath.select1('name', result)
            assert.strictEqual(name.getAttribute('type'), 'personal')
            assert.ok(xpath.select1('role/roleTerm', name))

            const dateCreated = xpath.select1('originInfo/dateCreated', result)
            assert.strictEqual(dateCreated.textContent, '2019-05-04')
            assert.strictEqual(dateCreated.getAttribute('encoding'), 'w3cdtf')

            const text = xpath.select1('part/text', result)
            assert.strictEqual(text.getAttribute('type'), 'attachment-uuid')
            assert.strictEqual(text.textContent, 'uuid-only')
        })
    })
})
