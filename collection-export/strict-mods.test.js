import assert from 'node:assert'
import { describe, it } from 'mocha'
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'

import { unwrapSimpleElement, unwrapDateCreated, unwrapDateOther, renameElement, removeElement, removeEmptyElements, removeAttribute, convertAuthorityElement, moveClassificationToSubject, wrapElement, wrapTextWithChild, moveAndRenameElement, convertNamePartDate, toStrictMODS } from './strict-mods.js'

// Test fixtures
const fixtures = {
    typeOfResourceWrapper: {
        input: `<xml><mods>
            <typeOfResourceWrapper><typeOfResource>text</typeOfResource></typeOfResourceWrapper>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <typeOfResource>text</typeOfResource>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`
    },

    typeOfResourceWrapperEmpty: {
        input: `<xml><mods>
            <typeOfResourceWrapper><typeOfResource/></typeOfResourceWrapper>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <typeOfResource/>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`
    },

    multipleTypeOfResourceWrappers: {
        input: `<xml><mods>
            <typeOfResourceWrapper><typeOfResource>text</typeOfResource></typeOfResourceWrapper>
            <titleInfo><title>Test Item</title></titleInfo>
            <typeOfResourceWrapper><typeOfResource>still image</typeOfResource></typeOfResourceWrapper>
        </mods></xml>`,
        expected: `<xml><mods>
            <typeOfResource>text</typeOfResource>
            <titleInfo><title>Test Item</title></titleInfo>
            <typeOfResource>still image</typeOfResource>
        </mods></xml>`
    },

    noTypeOfResourceWrapper: {
        input: `<xml><mods>
            <titleInfo><title>Test Item</title></titleInfo>
            <typeOfResource>text</typeOfResource>
        </mods></xml>`,
        expected: `<xml><mods>
            <titleInfo><title>Test Item</title></titleInfo>
            <typeOfResource>text</typeOfResource>
        </mods></xml>`
    },

    genreWrapper: {
        input: `<xml><mods>
            <genreWrapper><genre authority="aat">photographs</genre></genreWrapper>
            <titleInfo><title>Test Photo</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <genre authority="aat">photographs</genre>
            <titleInfo><title>Test Photo</title></titleInfo>
        </mods></xml>`
    },

    genreWrapperEmpty: {
        input: `<xml><mods>
            <genreWrapper><genre/></genreWrapper>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <genre/>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`
    },

    noteWrapper: {
        input: `<xml><mods>
            <noteWrapper><note type="depicted persons">John Doe</note></noteWrapper>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <note type="depicted persons">John Doe</note>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`
    },

    multipleNoteWrappers: {
        input: `<xml><mods>
            <noteWrapper><note type="depicted persons">John Doe</note></noteWrapper>
            <noteWrapper><note type="condition">good</note></noteWrapper>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <note type="depicted persons">John Doe</note>
            <note type="condition">good</note>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`
    },

    allWrappers: {
        input: `<xml><mods>
            <typeOfResourceWrapper><typeOfResource>text</typeOfResource></typeOfResourceWrapper>
            <genreWrapper><genre>correspondence</genre></genreWrapper>
            <noteWrapper><note>Test note</note></noteWrapper>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <typeOfResource>text</typeOfResource>
            <genre>correspondence</genre>
            <note>Test note</note>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`
    },

    dateCreatedSingle: {
        input: `<xml><mods>
            <origininfo>
                <dateType>dateCreated</dateType>
                <dateCreatedWrapper>
                    <dateCreated keyDate="yes">1925-01-20</dateCreated>
                    <pointStart/>
                    <pointEnd/>
                </dateCreatedWrapper>
            </origininfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <originInfo>
                <dateCreated keyDate="yes">1925-01-20</dateCreated>
            </originInfo>
        </mods></xml>`
    },

    dateCreatedRange: {
        input: `<xml><mods>
            <origininfo>
                <dateType>dateCreated</dateType>
                <dateCreatedWrapper>
                    <dateCreated keyDate="yes"/>
                    <pointStart>2022</pointStart>
                    <pointEnd>2023</pointEnd>
                </dateCreatedWrapper>
            </origininfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <originInfo>
                <dateCreated encoding="edtf" keyDate="yes">2022/2023</dateCreated>
            </originInfo>
        </mods></xml>`
    },

    dateCreatedRangeNoKeyDate: {
        input: `<xml><mods>
            <origininfo>
                <dateCreatedWrapper>
                    <dateCreated/>
                    <pointStart>2024-01</pointStart>
                    <pointEnd>2025-12</pointEnd>
                </dateCreatedWrapper>
            </origininfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <originInfo>
                <dateCreated encoding="edtf">2024-01/2025-12</dateCreated>
            </originInfo>
        </mods></xml>`
    },

    dateCreatedEmpty: {
        input: `<xml><mods>
            <origininfo>
                <dateType>dateCreated</dateType>
                <dateCreatedWrapper>
                    <dateCreated/>
                    <pointStart/>
                    <pointEnd/>
                </dateCreatedWrapper>
            </origininfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <originInfo/>
        </mods></xml>`
    },

    subjectWithType: {
        input: `<xml><mods>
            <subject><subjectType>temporal</subjectType><temporal>1922-1935</temporal></subject>
            <subject><subjectType>topic</subjectType><topic authority="lcsh">Test</topic></subject>
        </mods></xml>`,
        expected: `<xml><mods>
            <subject><temporal>1922-1935</temporal></subject>
            <subject><topic authority="lcsh">Test</topic></subject>
        </mods></xml>`
    },

    relateditemCase: {
        input: `<xml><mods>
            <relateditem type="host"><title>Host Title</title></relateditem>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`,
        expected: `<xml><mods>
            <relatedItem type="host"><title>Host Title</title></relatedItem>
            <titleInfo><title>Test Item</title></titleInfo>
        </mods></xml>`
    }
}

// Helper function to normalize XML for comparison (removes whitespace differences)
function normalizeXML(xmlString) {
    return xmlString.replace(/>\s+</g, '><').trim()
}

describe('Strict MODS Conversion', () => {
    describe('unwrapSimpleElement', () => {
        it('should unwrap typeOfResourceWrapper with text content', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.typeOfResourceWrapper.input, 'text/xml')

            unwrapSimpleElement(doc, 'typeOfResourceWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.typeOfResourceWrapper.expected)

            assert.strictEqual(result, expected)
        })

        it('should unwrap typeOfResourceWrapper with empty element', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.typeOfResourceWrapperEmpty.input, 'text/xml')

            unwrapSimpleElement(doc, 'typeOfResourceWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.typeOfResourceWrapperEmpty.expected)

            assert.strictEqual(result, expected)
        })

        it('should handle multiple typeOfResourceWrapper elements', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.multipleTypeOfResourceWrappers.input, 'text/xml')

            unwrapSimpleElement(doc, 'typeOfResourceWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.multipleTypeOfResourceWrappers.expected)

            assert.strictEqual(result, expected)
        })

        it('should not modify XML without typeOfResourceWrapper', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.noTypeOfResourceWrapper.input, 'text/xml')

            unwrapSimpleElement(doc, 'typeOfResourceWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.noTypeOfResourceWrapper.expected)

            assert.strictEqual(result, expected)
        })

        it('should unwrap genreWrapper with attributes', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.genreWrapper.input, 'text/xml')

            unwrapSimpleElement(doc, 'genreWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.genreWrapper.expected)

            assert.strictEqual(result, expected)
        })

        it('should unwrap empty genreWrapper', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.genreWrapperEmpty.input, 'text/xml')

            unwrapSimpleElement(doc, 'genreWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.genreWrapperEmpty.expected)

            assert.strictEqual(result, expected)
        })

        it('should unwrap noteWrapper with attributes', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.noteWrapper.input, 'text/xml')

            unwrapSimpleElement(doc, 'noteWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.noteWrapper.expected)

            assert.strictEqual(result, expected)
        })

        it('should handle multiple noteWrapper elements', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.multipleNoteWrappers.input, 'text/xml')

            unwrapSimpleElement(doc, 'noteWrapper')

            const result = normalizeXML(doc.toString())
            const expected = normalizeXML(fixtures.multipleNoteWrappers.expected)

            assert.strictEqual(result, expected)
        })

        it('should verify wrapper elements no longer exist after unwrapping', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.typeOfResourceWrapper.input, 'text/xml')

            unwrapSimpleElement(doc, 'typeOfResourceWrapper')

            const select = xpath.useNamespaces({})
            const wrapperElements = select('//mods/typeOfResourceWrapper', doc)
            const unwrappedElements = select('//mods/typeOfResource', doc)

            assert.strictEqual(wrapperElements.length, 0)
            assert.strictEqual(unwrappedElements.length, 1)
            assert.strictEqual(unwrappedElements[0].textContent, 'text')
        })
    })

    describe('unwrapDateCreated', () => {
        it('should unwrap single date and preserve keyDate attribute', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.dateCreatedSingle.input, 'text/xml')

            unwrapDateCreated(doc)
            removeElement(doc, 'dateType', '//origininfo')

            const select = xpath.useNamespaces({})
            const dateElements = select('//origininfo/dateCreated', doc)

            assert.strictEqual(dateElements.length, 1)
            assert.strictEqual(dateElements[0].textContent, '1925-01-20')
            assert.strictEqual(dateElements[0].getAttribute('keyDate'), 'yes')

            // Verify wrapper is gone
            const wrappers = select('//origininfo/dateCreatedWrapper', doc)
            assert.strictEqual(wrappers.length, 0)
        })

        it('should convert date range to EDTF format', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.dateCreatedRange.input, 'text/xml')

            unwrapDateCreated(doc)

            const select = xpath.useNamespaces({})
            const dateElements = select('//origininfo/dateCreated', doc)

            assert.strictEqual(dateElements.length, 1)
            assert.strictEqual(dateElements[0].textContent, '2022/2023')
            assert.strictEqual(dateElements[0].getAttribute('encoding'), 'edtf')
            assert.strictEqual(dateElements[0].getAttribute('keyDate'), 'yes')
        })

        it('should handle date range without keyDate attribute', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.dateCreatedRangeNoKeyDate.input, 'text/xml')

            unwrapDateCreated(doc)

            const select = xpath.useNamespaces({})
            const dateElements = select('//origininfo/dateCreated', doc)

            assert.strictEqual(dateElements.length, 1)
            assert.strictEqual(dateElements[0].textContent, '2024-01/2025-12')
            assert.strictEqual(dateElements[0].getAttribute('encoding'), 'edtf')
            assert.strictEqual(dateElements[0].hasAttribute('keyDate'), false)
        })

        it('should remove empty dateCreatedWrapper', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.dateCreatedEmpty.input, 'text/xml')

            unwrapDateCreated(doc)
            removeElement(doc, 'dateType', '//origininfo')

            const select = xpath.useNamespaces({})
            const dateElements = select('//origininfo/dateCreated', doc)
            const wrappers = select('//origininfo/dateCreatedWrapper', doc)

            assert.strictEqual(dateElements.length, 0)
            assert.strictEqual(wrappers.length, 0)
        })
    })

    describe('unwrapDateOther', () => {
        it('should unwrap single dateOther and preserve encoding and type attributes', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <origininfo>
                    <dateOtherWrapper>
                        <dateOther encoding="w3cdtf" type="exhibit">2016-12-05</dateOther>
                    </dateOtherWrapper>
                </origininfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            unwrapDateOther(doc)

            const select = xpath.useNamespaces({})
            const dateOthers = select('//origininfo/dateOther', doc)
            const wrappers = select('//origininfo/dateOtherWrapper', doc)

            assert.strictEqual(wrappers.length, 0, 'Wrapper should be removed')
            assert.strictEqual(dateOthers.length, 1, 'Should have one dateOther')
            assert.strictEqual(dateOthers[0].textContent, '2016-12-05')
            assert.strictEqual(dateOthers[0].getAttribute('encoding'), 'w3cdtf')
            assert.strictEqual(dateOthers[0].getAttribute('type'), 'exhibit')
        })

        it('should convert dateOther range to EDTF format and preserve type', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <origininfo>
                    <dateOtherWrapper>
                        <dateOther encoding="w3cdtf" type="In use"/>
                        <pointStart>1907</pointStart>
                        <pointEnd>2027</pointEnd>
                    </dateOtherWrapper>
                </origininfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            unwrapDateOther(doc)

            const select = xpath.useNamespaces({})
            const dateOthers = select('//origininfo/dateOther', doc)
            const wrappers = select('//origininfo/dateOtherWrapper', doc)

            assert.strictEqual(wrappers.length, 0, 'Wrapper should be removed')
            assert.strictEqual(dateOthers.length, 1, 'Should have one dateOther')
            assert.strictEqual(dateOthers[0].textContent, '1907/2027', 'Should be in EDTF format')
            assert.strictEqual(dateOthers[0].getAttribute('encoding'), 'edtf')
            assert.strictEqual(dateOthers[0].getAttribute('type'), 'In use', 'Type should be preserved')
        })

        it('should handle dateOther range without type attribute', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <origininfo>
                    <dateOtherWrapper>
                        <dateOther encoding="w3cdtf"/>
                        <pointStart>2014-12-01</pointStart>
                        <pointEnd>2014-12-12</pointEnd>
                    </dateOtherWrapper>
                </origininfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            unwrapDateOther(doc)

            const select = xpath.useNamespaces({})
            const dateOthers = select('//origininfo/dateOther', doc)

            assert.strictEqual(dateOthers.length, 1)
            assert.strictEqual(dateOthers[0].textContent, '2014-12-01/2014-12-12')
            assert.strictEqual(dateOthers[0].getAttribute('encoding'), 'edtf')
            assert.strictEqual(dateOthers[0].hasAttribute('type'), false, 'Should not have type if not in original')
        })

        it('should remove empty dateOtherWrapper', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <origininfo>
                    <dateOtherWrapper>
                        <dateOther encoding="w3cdtf" type="exhibit"/>
                    </dateOtherWrapper>
                </origininfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            unwrapDateOther(doc)

            const select = xpath.useNamespaces({})
            const dateOthers = select('//origininfo/dateOther', doc)
            const wrappers = select('//origininfo/dateOtherWrapper', doc)

            assert.strictEqual(wrappers.length, 0, 'Wrapper should be removed')
            assert.strictEqual(dateOthers.length, 0, 'Empty dateOther should not be created')
        })
    })

    describe('renameElement', () => {
        it('should rename element while preserving attributes and children', () => {
            const parser = new xmldom()
            const input = `<xml><mods><oldname attr="test"><child>content</child></oldname></mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            renameElement(doc, 'oldname', 'newName')

            const result = doc.toString()

            assert.ok(result.includes('<newName'))
            assert.ok(result.includes('</newName>'))
            assert.ok(!result.includes('<oldname'))
            assert.ok(result.includes('attr="test"'))
            assert.ok(result.includes('<child>content</child>'))
        })

        it('should convert origininfo to originInfo', () => {
            const parser = new xmldom()
            const input = `<xml><mods><origininfo><place/></origininfo></mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            renameElement(doc, 'origininfo', 'originInfo')

            const result = doc.toString()

            assert.ok(result.includes('<originInfo>'))
            assert.ok(result.includes('</originInfo>'))
            assert.ok(!result.includes('<origininfo>'))
            assert.ok(!result.includes('</origininfo>'))
        })

        it('should convert relateditem to relatedItem', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.relateditemCase.input, 'text/xml')

            renameElement(doc, 'relateditem', 'relatedItem')

            const result = doc.toString()

            assert.ok(result.includes('<relatedItem'))
            assert.ok(result.includes('</relatedItem>'))
            assert.ok(!result.includes('<relateditem'))
            assert.ok(!result.includes('</relateditem>'))
            assert.ok(result.includes('type="host"'))
        })

        it('should add single attribute from map', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <part>
                    <number>abc-123-def-456</number>
                </part>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            renameElement(doc, 'number', 'text', '//part', { type: 'attachment-uuid' })

            const select = xpath.useNamespaces({})
            const textElements = select('//part/text', doc)

            assert.strictEqual(textElements.length, 1, 'text element should exist')
            assert.strictEqual(textElements[0].getAttribute('type'), 'attachment-uuid')
            assert.strictEqual(textElements[0].textContent, 'abc-123-def-456')
        })

        it('should add multiple attributes from map', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <part>
                    <number>abc-123</number>
                </part>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            renameElement(doc, 'number', 'text', '//part', { type: 'attachment-uuid', encoding: 'utf-8', lang: 'en' })

            const select = xpath.useNamespaces({})
            const textElements = select('//part/text', doc)

            assert.strictEqual(textElements.length, 1)
            assert.strictEqual(textElements[0].getAttribute('type'), 'attachment-uuid')
            assert.strictEqual(textElements[0].getAttribute('encoding'), 'utf-8')
            assert.strictEqual(textElements[0].getAttribute('lang'), 'en')
        })

        it('should preserve existing attributes when adding new ones from map', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <part>
                    <number id="123">abc-123</number>
                </part>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            renameElement(doc, 'number', 'text', '//part', { type: 'attachment-uuid' })

            const select = xpath.useNamespaces({})
            const textElements = select('//part/text', doc)

            assert.strictEqual(textElements.length, 1)
            assert.strictEqual(textElements[0].getAttribute('type'), 'attachment-uuid')
            assert.strictEqual(textElements[0].getAttribute('id'), '123', 'Should preserve original attribute')
        })
    })

    describe('removeElement', () => {
        it('should remove specified element', () => {
            const parser = new xmldom()
            const input = `<xml><mods><origininfo><dateType>dateCreated</dateType><place/></origininfo></mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeElement(doc, 'dateType', '//origininfo')

            const select = xpath.useNamespaces({})
            const dateTypes = select('//origininfo/dateType', doc)
            const places = select('//origininfo/place', doc)

            assert.strictEqual(dateTypes.length, 0)
            assert.strictEqual(places.length, 1)
        })

        it('should remove subjectType elements', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString(fixtures.subjectWithType.input, 'text/xml')

            removeElement(doc, 'subjectType', '//subject')

            const select = xpath.useNamespaces({})
            const subjectTypes = select('//subject/subjectType', doc)
            const temporals = select('//subject/temporal', doc)
            const topics = select('//subject/topic', doc)

            assert.strictEqual(subjectTypes.length, 0)
            assert.strictEqual(temporals.length, 1)
            assert.strictEqual(topics.length, 1)
        })
    })

    describe('removeAttribute', () => {
        it('should remove href attribute from accessCondition', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <accessCondition href="https://example.com" type="use and reproduction">License text</accessCondition>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeAttribute(doc, '//accessCondition', 'href')

            const select = xpath.useNamespaces({})
            const accessConditions = select('//accessCondition', doc)

            assert.strictEqual(accessConditions.length, 1)
            assert.strictEqual(accessConditions[0].hasAttribute('href'), false, 'href should be removed')
            assert.strictEqual(accessConditions[0].getAttribute('type'), 'use and reproduction', 'other attributes should be preserved')
            assert.strictEqual(accessConditions[0].textContent, 'License text')
        })

        it('should handle multiple elements with attribute', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <accessCondition href="https://example.com" type="restriction">One</accessCondition>
                <accessCondition href="https://other.com" type="use">Two</accessCondition>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeAttribute(doc, '//accessCondition', 'href')

            const select = xpath.useNamespaces({})
            const accessConditions = select('//accessCondition', doc)

            assert.strictEqual(accessConditions.length, 2)
            assert.strictEqual(accessConditions[0].hasAttribute('href'), false)
            assert.strictEqual(accessConditions[1].hasAttribute('href'), false)
        })

        it('should handle elements without the attribute', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <accessCondition type="use">No href here</accessCondition>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeAttribute(doc, '//accessCondition', 'href')

            const select = xpath.useNamespaces({})
            const accessConditions = select('//accessCondition', doc)

            assert.strictEqual(accessConditions.length, 1)
            assert.strictEqual(accessConditions[0].textContent, 'No href here')
        })
    })

    describe('removeEmptyElements', () => {
        it('should remove completely empty elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <originInfo><place/><publisher/></originInfo>
                <genre/>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeEmptyElements(doc)

            const select = xpath.useNamespaces({})
            const places = select('//place', doc)
            const publishers = select('//publisher', doc)
            const genres = select('//genre', doc)
            const originInfos = select('//originInfo', doc)
            const titleInfos = select('//titleInfo', doc)

            assert.strictEqual(places.length, 0, 'Empty place should be removed')
            assert.strictEqual(publishers.length, 0, 'Empty publisher should be removed')
            assert.strictEqual(genres.length, 0, 'Empty genre should be removed')
            assert.strictEqual(originInfos.length, 0, 'originInfo with only empty children should be removed')
            assert.strictEqual(titleInfos.length, 1, 'titleInfo with content should be preserved')
        })

        it('should preserve elements with text content', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <abstract>Some text</abstract>
                <note>  Another note  </note>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeEmptyElements(doc)

            const select = xpath.useNamespaces({})
            const abstracts = select('//abstract', doc)
            const notes = select('//note', doc)

            assert.strictEqual(abstracts.length, 1)
            assert.strictEqual(notes.length, 1)
        })

        it('should remove whitespace-only elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <genre>   </genre>
                <note>
                </note>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeEmptyElements(doc)

            const select = xpath.useNamespaces({})
            const genres = select('//genre', doc)
            const notes = select('//note', doc)

            assert.strictEqual(genres.length, 0, 'Whitespace-only genre should be removed')
            assert.strictEqual(notes.length, 0, 'Whitespace-only note should be removed')
        })

        it('should recursively remove empty parent elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <originInfo>
                    <place/>
                    <publisher/>
                    <dateOther/>
                </originInfo>
                <subject>
                    <topic>Valid topic</topic>
                </subject>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeEmptyElements(doc)

            const select = xpath.useNamespaces({})
            const originInfos = select('//originInfo', doc)
            const subjects = select('//subject', doc)

            assert.strictEqual(originInfos.length, 0, 'originInfo with only empty children should be removed')
            assert.strictEqual(subjects.length, 1, 'subject with content should be preserved')
        })

        it('should handle nested empty structures', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <relatedItem>
                    <titleInfo><title/></titleInfo>
                    <location/>
                </relatedItem>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            removeEmptyElements(doc)

            const select = xpath.useNamespaces({})
            const relatedItems = select('//relatedItem', doc)

            assert.strictEqual(relatedItems.length, 0, 'Entire nested empty structure should be removed')
        })
    })

    describe('convertAuthorityElement', () => {
        it('should convert topicCONA to topic with authority="cona"', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <subject><topicCONA>Architecture</topicCONA></subject>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertAuthorityElement(doc, 'topicCONA', 'topic', 'cona')

            const select = xpath.useNamespaces({})
            const topicCONAs = select('//subject/topicCONA', doc)
            const topics = select('//subject/topic', doc)

            assert.strictEqual(topicCONAs.length, 0, 'topicCONA should be removed')
            assert.strictEqual(topics.length, 1, 'topic should exist')
            assert.strictEqual(topics[0].textContent, 'Architecture')
            assert.strictEqual(topics[0].getAttribute('authority'), 'cona')
        })

        it('should handle multiple topicCONA elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <subject><topicCONA>Architecture</topicCONA></subject>
                <subject><topicCONA>Sculpture</topicCONA></subject>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertAuthorityElement(doc, 'topicCONA', 'topic', 'cona')

            const select = xpath.useNamespaces({})
            const topics = select('//subject/topic', doc)

            assert.strictEqual(topics.length, 2)
            assert.strictEqual(topics[0].textContent, 'Architecture')
            assert.strictEqual(topics[0].getAttribute('authority'), 'cona')
            assert.strictEqual(topics[1].textContent, 'Sculpture')
            assert.strictEqual(topics[1].getAttribute('authority'), 'cona')
        })

        it('should preserve existing attributes on custom element', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <subject><topicCONA type="genre">Painting</topicCONA></subject>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertAuthorityElement(doc, 'topicCONA', 'topic', 'cona')

            const select = xpath.useNamespaces({})
            const topics = select('//subject/topic', doc)

            assert.strictEqual(topics.length, 1)
            assert.strictEqual(topics[0].getAttribute('authority'), 'cona')
            assert.strictEqual(topics[0].getAttribute('type'), 'genre')
        })

        it('should handle empty topicCONA elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <subject><topicCONA/></subject>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertAuthorityElement(doc, 'topicCONA', 'topic', 'cona')

            const select = xpath.useNamespaces({})
            const topics = select('//subject/topic', doc)

            assert.strictEqual(topics.length, 1)
            assert.strictEqual(topics[0].textContent, '')
            assert.strictEqual(topics[0].getAttribute('authority'), 'cona')
        })
    })

    describe('moveClassificationToSubject', () => {
        it('should move photoClassification to subject/topic with authority', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <photoClassification>photographs</photoClassification>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveClassificationToSubject(doc, 'photoClassification', 'local')

            const select = xpath.useNamespaces({})
            const photoClassifications = select('//photoClassification', doc)
            const subjects = select('//subject', doc)
            const topics = select('//subject/topic', doc)

            assert.strictEqual(photoClassifications.length, 0, 'photoClassification should be removed')
            assert.strictEqual(subjects.length, 1, 'subject should be created')
            assert.strictEqual(topics.length, 1, 'topic should be created')
            assert.strictEqual(topics[0].textContent, 'photographs')
            assert.strictEqual(topics[0].getAttribute('authority'), 'local')
        })

        it('should handle multiple photoClassification elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <photoClassification>portraits</photoClassification>
                <photoClassification>landscapes</photoClassification>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveClassificationToSubject(doc, 'photoClassification', 'local')

            const select = xpath.useNamespaces({})
            const subjects = select('//subject', doc)
            const topics = select('//subject/topic', doc)

            assert.strictEqual(subjects.length, 2, 'Two subjects should be created')
            assert.strictEqual(topics.length, 2, 'Two topics should be created')
            assert.strictEqual(topics[0].textContent, 'portraits')
            assert.strictEqual(topics[1].textContent, 'landscapes')
            assert.strictEqual(topics[0].getAttribute('authority'), 'local')
            assert.strictEqual(topics[1].getAttribute('authority'), 'local')
        })

        it('should skip empty photoClassification elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <photoClassification/>
                <photoClassification>  </photoClassification>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveClassificationToSubject(doc, 'photoClassification', 'local')

            const select = xpath.useNamespaces({})
            const subjects = select('//subject', doc)

            assert.strictEqual(subjects.length, 0, 'No subjects should be created for empty classifications')
        })

        it('should preserve existing attributes from photoClassification', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <photoClassification type="genre">architectural</photoClassification>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveClassificationToSubject(doc, 'photoClassification', 'local')

            const select = xpath.useNamespaces({})
            const topics = select('//subject/topic', doc)

            assert.strictEqual(topics.length, 1)
            assert.strictEqual(topics[0].getAttribute('authority'), 'local')
            assert.strictEqual(topics[0].getAttribute('type'), 'genre')
        })
    })

    describe('wrapElement', () => {
        it('should wrap relatedItem/title with titleInfo', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <relatedItem type="host"><title>Parent Collection</title></relatedItem>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapElement(doc, '//relatedItem', 'title', 'titleInfo')

            const select = xpath.useNamespaces({})
            const directTitles = select('//relatedItem/title', doc)
            const wrappedTitles = select('//relatedItem/titleInfo/title', doc)

            assert.strictEqual(directTitles.length, 0, 'Direct title should not exist')
            assert.strictEqual(wrappedTitles.length, 1, 'Wrapped title should exist')
            assert.strictEqual(wrappedTitles[0].textContent, 'Parent Collection')
        })

        it('should handle multiple relatedItem elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <relatedItem type="host"><title>Collection A</title></relatedItem>
                <relatedItem type="series"><title>Collection B</title></relatedItem>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapElement(doc, '//relatedItem', 'title', 'titleInfo')

            const select = xpath.useNamespaces({})
            const wrappedTitles = select('//relatedItem/titleInfo/title', doc)

            assert.strictEqual(wrappedTitles.length, 2)
            assert.strictEqual(wrappedTitles[0].textContent, 'Collection A')
            assert.strictEqual(wrappedTitles[1].textContent, 'Collection B')
        })

        it('should not wrap already wrapped titles', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <relatedItem><titleInfo><title>Already Wrapped</title></titleInfo></relatedItem>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapElement(doc, '//relatedItem', 'title', 'titleInfo')

            const select = xpath.useNamespaces({})
            const wrappedTitles = select('//relatedItem/titleInfo/title', doc)
            const doubleWrapped = select('//relatedItem/titleInfo/titleInfo', doc)

            assert.strictEqual(wrappedTitles.length, 1)
            assert.strictEqual(doubleWrapped.length, 0, 'Should not double-wrap')
        })

        it('should preserve attributes on title element', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <relatedItem><title type="alternative">Alt Title</title></relatedItem>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapElement(doc, '//relatedItem', 'title', 'titleInfo')

            const select = xpath.useNamespaces({})
            const wrappedTitles = select('//relatedItem/titleInfo/title', doc)

            assert.strictEqual(wrappedTitles.length, 1)
            assert.strictEqual(wrappedTitles[0].getAttribute('type'), 'alternative')
        })
    })

    describe('moveAndRenameElement', () => {
        it('should move formBroad to genre', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <physicalDescription>
                    <formBroad>correspondence</formBroad>
                    <digitalOrigin>born digital</digitalOrigin>
                </physicalDescription>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveAndRenameElement(doc, '//physicalDescription/formBroad', '//mods', 'genre')

            const select = xpath.useNamespaces({})
            const formBroads = select('//physicalDescription/formBroad', doc)
            const genres = select('//mods/genre', doc)

            assert.strictEqual(formBroads.length, 0, 'formBroad should be removed')
            assert.strictEqual(genres.length, 1, 'genre should exist')
            assert.strictEqual(genres[0].textContent, 'correspondence')
        })

        it('should move formSpecific to genre', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <physicalDescription>
                    <formSpecific>personal</formSpecific>
                </physicalDescription>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveAndRenameElement(doc, '//physicalDescription/formSpecific', '//mods', 'genre')

            const select = xpath.useNamespaces({})
            const formSpecifics = select('//physicalDescription/formSpecific', doc)
            const genres = select('//mods/genre', doc)

            assert.strictEqual(formSpecifics.length, 0, 'formSpecific should be removed')
            assert.strictEqual(genres.length, 1, 'genre should exist')
            assert.strictEqual(genres[0].textContent, 'personal')
        })

        it('should handle both formBroad and formSpecific', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <physicalDescription>
                    <formBroad>photographs</formBroad>
                    <formSpecific>portrait</formSpecific>
                </physicalDescription>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveAndRenameElement(doc, '//physicalDescription/formBroad', '//mods', 'genre')
            moveAndRenameElement(doc, '//physicalDescription/formSpecific', '//mods', 'genre')

            const select = xpath.useNamespaces({})
            const genres = select('//mods/genre', doc)

            assert.strictEqual(genres.length, 2, 'Should have two genres')
            assert.strictEqual(genres[0].textContent, 'photographs')
            assert.strictEqual(genres[1].textContent, 'portrait')
        })

        it('should preserve attributes on moved elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <physicalDescription>
                    <formBroad authority="local">special-type</formBroad>
                </physicalDescription>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveAndRenameElement(doc, '//physicalDescription/formBroad', '//mods', 'genre')

            const select = xpath.useNamespaces({})
            const genres = select('//mods/genre', doc)

            assert.strictEqual(genres.length, 1)
            assert.strictEqual(genres[0].getAttribute('authority'), 'local')
        })

        it('should skip empty elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <physicalDescription>
                    <formBroad/>
                    <formSpecific>  </formSpecific>
                </physicalDescription>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            moveAndRenameElement(doc, '//physicalDescription/formBroad', '//mods', 'genre')
            moveAndRenameElement(doc, '//physicalDescription/formSpecific', '//mods', 'genre')

            const select = xpath.useNamespaces({})
            const genres = select('//mods/genre', doc)

            assert.strictEqual(genres.length, 0, 'Should not create genres for empty elements')
        })
    })

    describe('wrapTextWithChild', () => {
        it('should wrap language text with languageTerm and move authority', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <language authority="iso639-2b">eng</language>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//mods/language', 'languageTerm', ['authority'])

            const select = xpath.useNamespaces({})
            const languages = select('//mods/language', doc)
            const languageTerms = select('//mods/language/languageTerm', doc)

            assert.strictEqual(languages.length, 1, 'language element should exist')
            assert.strictEqual(languageTerms.length, 1, 'languageTerm should exist')
            assert.strictEqual(languageTerms[0].textContent, 'eng')
            assert.strictEqual(languageTerms[0].getAttribute('authority'), 'iso639-2b')
            assert.strictEqual(languages[0].hasAttribute('authority'), false, 'authority should be removed from language')
        })

        it('should handle multiple language elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <language authority="iso639-2b">eng</language>
                <language authority="iso639-2b">spa</language>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//mods/language', 'languageTerm', ['authority'])

            const select = xpath.useNamespaces({})
            const languageTerms = select('//mods/language/languageTerm', doc)

            assert.strictEqual(languageTerms.length, 2)
            assert.strictEqual(languageTerms[0].textContent, 'eng')
            assert.strictEqual(languageTerms[1].textContent, 'spa')
        })

        it('should not wrap already wrapped language elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <language>
                    <languageTerm authority="iso639-2b">eng</languageTerm>
                </language>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//mods/language', 'languageTerm', ['authority'])

            const select = xpath.useNamespaces({})
            const languageTerms = select('//mods/language/languageTerm', doc)
            const doubleWrapped = select('//mods/language/languageTerm/languageTerm', doc)

            assert.strictEqual(languageTerms.length, 1)
            assert.strictEqual(doubleWrapped.length, 0, 'Should not double-wrap')
        })

        it('should work without attributes to move', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <language>eng</language>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//mods/language', 'languageTerm', [])

            const select = xpath.useNamespaces({})
            const languageTerms = select('//mods/language/languageTerm', doc)

            assert.strictEqual(languageTerms.length, 1)
            assert.strictEqual(languageTerms[0].textContent, 'eng')
        })

        it('should wrap originInfo/place text with placeTerm', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <originInfo>
                    <place>Oakland, CA</place>
                    <publisher>Test Publisher</publisher>
                </originInfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//originInfo/place', 'placeTerm', [])

            const select = xpath.useNamespaces({})
            const places = select('//originInfo/place', doc)
            const placeTerms = select('//originInfo/place/placeTerm', doc)

            assert.strictEqual(places.length, 1, 'place element should exist')
            assert.strictEqual(placeTerms.length, 1, 'placeTerm should exist')
            assert.strictEqual(placeTerms[0].textContent, 'Oakland, CA')
        })

        it('should not wrap empty place elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <originInfo>
                    <place/>
                    <publisher>Test Publisher</publisher>
                </originInfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//originInfo/place', 'placeTerm', [])

            const select = xpath.useNamespaces({})
            const placeTerms = select('//originInfo/place/placeTerm', doc)

            assert.strictEqual(placeTerms.length, 0, 'Should not create placeTerm for empty place')
        })

        it('should not double-wrap already wrapped place elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <originInfo>
                    <place>
                        <placeTerm>San Francisco</placeTerm>
                    </place>
                </originInfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//originInfo/place', 'placeTerm', [])

            const select = xpath.useNamespaces({})
            const placeTerms = select('//originInfo/place/placeTerm', doc)
            const doubleWrapped = select('//originInfo/place/placeTerm/placeTerm', doc)

            assert.strictEqual(placeTerms.length, 1, 'Should have one placeTerm')
            assert.strictEqual(doubleWrapped.length, 0, 'Should not double-wrap')
        })

        it('should wrap subject/name text with namePart', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <subject>
                    <name authority="local" type="personal">Bruce, Tecoah P.</name>
                </subject>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//subject/name', 'namePart', [])

            const select = xpath.useNamespaces({})
            const names = select('//subject/name', doc)
            const nameParts = select('//subject/name/namePart', doc)

            assert.strictEqual(names.length, 1, 'name element should exist')
            assert.strictEqual(nameParts.length, 1, 'namePart should exist')
            assert.strictEqual(nameParts[0].textContent, 'Bruce, Tecoah P.')
            assert.strictEqual(names[0].getAttribute('authority'), 'local', 'authority should be preserved on name')
            assert.strictEqual(names[0].getAttribute('type'), 'personal', 'type should be preserved on name')
        })

        it('should not double-wrap already wrapped subject/name elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <subject>
                    <name authority="local" type="personal">
                        <namePart>Smith, John</namePart>
                    </name>
                </subject>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            wrapTextWithChild(doc, '//subject/name', 'namePart', [])

            const select = xpath.useNamespaces({})
            const nameParts = select('//subject/name/namePart', doc)
            const doubleWrapped = select('//subject/name/namePart/namePart', doc)

            assert.strictEqual(nameParts.length, 1, 'Should have one namePart')
            assert.strictEqual(doubleWrapped.length, 0, 'Should not double-wrap')
            assert.strictEqual(nameParts[0].textContent, 'Smith, John')
        })
    })

    describe('convertNamePartDate', () => {
        it('should convert namePartDate to namePart with type="date"', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <name type="personal">
                    <namePart>Doe, John</namePart>
                    <namePartDate>1920-2000</namePartDate>
                </name>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertNamePartDate(doc)

            const select = xpath.useNamespaces({})
            const namePartDates = select('//name/namePartDate', doc)
            const nameParts = select('//name/namePart', doc)
            const dateNameParts = select('//name/namePart[@type="date"]', doc)

            assert.strictEqual(namePartDates.length, 0, 'namePartDate should be removed')
            assert.strictEqual(nameParts.length, 2, 'Should have 2 namePart elements')
            assert.strictEqual(dateNameParts.length, 1, 'Should have 1 namePart with type="date"')
            assert.strictEqual(dateNameParts[0].textContent, '1920-2000')
            assert.strictEqual(dateNameParts[0].getAttribute('type'), 'date')
        })

        it('should handle empty namePartDate elements', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <name type="personal">
                    <namePart>Smith, Jane</namePart>
                    <namePartDate/>
                </name>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertNamePartDate(doc)

            const select = xpath.useNamespaces({})
            const namePartDates = select('//name/namePartDate', doc)
            const dateNameParts = select('//name/namePart[@type="date"]', doc)

            assert.strictEqual(namePartDates.length, 0, 'namePartDate should be removed')
            assert.strictEqual(dateNameParts.length, 1, 'Should have 1 empty namePart with type="date"')
            assert.strictEqual(dateNameParts[0].textContent, '')
        })

        it('should handle multiple name elements with namePartDate', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <name type="personal">
                    <namePart>Doe, John</namePart>
                    <namePartDate>1920-2000</namePartDate>
                </name>
                <name type="personal">
                    <namePart>Smith, Jane</namePart>
                    <namePartDate>1930-2010</namePartDate>
                </name>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertNamePartDate(doc)

            const select = xpath.useNamespaces({})
            const namePartDates = select('//name/namePartDate', doc)
            const dateNameParts = select('//name/namePart[@type="date"]', doc)

            assert.strictEqual(namePartDates.length, 0, 'All namePartDate should be removed')
            assert.strictEqual(dateNameParts.length, 2, 'Should have 2 namePart with type="date"')
            assert.strictEqual(dateNameParts[0].textContent, '1920-2000')
            assert.strictEqual(dateNameParts[1].textContent, '1930-2010')
        })

        it('should preserve existing attributes on namePartDate', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <name type="personal">
                    <namePart>Doe, John</namePart>
                    <namePartDate encoding="w3cdtf">1920-01-01</namePartDate>
                </name>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertNamePartDate(doc)

            const select = xpath.useNamespaces({})
            const dateNameParts = select('//name/namePart[@type="date"]', doc)

            assert.strictEqual(dateNameParts.length, 1)
            assert.strictEqual(dateNameParts[0].getAttribute('type'), 'date')
            assert.strictEqual(dateNameParts[0].getAttribute('encoding'), 'w3cdtf')
            assert.strictEqual(dateNameParts[0].textContent, '1920-01-01')
        })

        it('should not affect name elements without namePartDate', () => {
            const parser = new xmldom()
            const input = `<xml><mods>
                <name type="personal">
                    <namePart>Doe, John</namePart>
                    <namePart type="date">1920-2000</namePart>
                    <role><roleTerm>author</roleTerm></role>
                </name>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

            convertNamePartDate(doc)

            const select = xpath.useNamespaces({})
            const nameParts = select('//name/namePart', doc)
            const dateNameParts = select('//name/namePart[@type="date"]', doc)
            const roles = select('//name/role', doc)

            assert.strictEqual(nameParts.length, 2, 'Should still have 2 namePart elements')
            assert.strictEqual(dateNameParts.length, 1, 'Should still have 1 namePart with type="date"')
            assert.strictEqual(roles.length, 1, 'Should preserve role element')
        })
    })

    describe('toStrictMODS', () => {
        it('should extract mods element and add namespace by default', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <typeOfResourceWrapper><typeOfResource>text</typeOfResource></typeOfResourceWrapper>
            </mods></xml>`

            const result = toStrictMODS(input)

            // Should not include xml wrapper
            assert.ok(!result.includes('<xml>'))
            assert.ok(!result.includes('</xml>'))
            // Should include mods element with namespace
            assert.ok(result.includes('<mods'))
            assert.ok(result.includes('xmlns="http://www.loc.gov/mods/v3"'))
            assert.ok(result.includes('</mods>'))
            // Should have applied transformations
            assert.ok(result.includes('<typeOfResource>text</typeOfResource>'))
            assert.ok(!result.includes('typeOfResourceWrapper'))
        })

        it('should preserve existing MODS namespace', () => {
            const input = `<xml><mods xmlns="http://www.loc.gov/mods/v3">
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            const result = toStrictMODS(input)

            // Should preserve namespace
            assert.ok(result.includes('xmlns="http://www.loc.gov/mods/v3"'))
            // Should only appear once
            const matches = result.match(/xmlns="http:\/\/www\.loc\.gov\/mods\/v3"/g)
            assert.strictEqual(matches.length, 1, 'Namespace should appear exactly once')
        })

        it('should convert XML string with typeOfResourceWrapper', () => {
            const input = fixtures.typeOfResourceWrapper.input
            const result = normalizeXML(toStrictMODS(input))

            // Check transformations applied
            assert.ok(result.includes('<typeOfResource>text</typeOfResource>'))
            assert.ok(!result.includes('typeOfResourceWrapper'))
            assert.ok(result.includes('xmlns="http://www.loc.gov/mods/v3"'))
        })

        it('should convert XML string with genreWrapper', () => {
            const input = fixtures.genreWrapper.input
            const result = normalizeXML(toStrictMODS(input))

            assert.ok(result.includes('<genre authority="aat">photographs</genre>'))
            assert.ok(!result.includes('genreWrapper'))
        })

        it('should convert XML string with noteWrapper', () => {
            const input = fixtures.noteWrapper.input
            const result = normalizeXML(toStrictMODS(input))

            assert.ok(result.includes('<note type="depicted persons">John Doe</note>'))
            assert.ok(!result.includes('noteWrapper'))
        })

        it('should convert XML with all wrapper types', () => {
            const input = fixtures.allWrappers.input
            const result = normalizeXML(toStrictMODS(input))

            assert.ok(result.includes('<typeOfResource>text</typeOfResource>'))
            assert.ok(result.includes('<genre>correspondence</genre>'))
            assert.ok(result.includes('<note>Test note</note>'))
            assert.ok(!result.includes('Wrapper'))
        })

        it('should convert single date with originInfo case fix', () => {
            const input = fixtures.dateCreatedSingle.input
            const result = normalizeXML(toStrictMODS(input))

            assert.ok(result.includes('<originInfo>'))
            assert.ok(result.includes('<dateCreated keyDate="yes">1925-01-20</dateCreated>'))
            assert.ok(!result.includes('<origininfo>'))
            assert.ok(!result.includes('dateType'))
        })

        it('should convert date range to EDTF', () => {
            const input = fixtures.dateCreatedRange.input
            const result = normalizeXML(toStrictMODS(input))

            assert.ok(result.includes('<dateCreated encoding="edtf" keyDate="yes">2022/2023</dateCreated>'))
        })

        it('should convert dateOther range to EDTF and preserve type', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test Item</title></titleInfo>
                <origininfo>
                    <dateType>Other</dateType>
                    <dateOtherWrapper>
                        <dateOther encoding="w3cdtf" type="In use"/>
                        <pointStart>1907</pointStart>
                        <pointEnd>2027</pointEnd>
                    </dateOtherWrapper>
                </origininfo>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<dateOther encoding="edtf" type="In use">1907/2027</dateOther>'),
                'Should convert dateOther range to EDTF and preserve type attribute')
            assert.ok(!result.includes('dateOtherWrapper'), 'Should remove wrapper')
            assert.ok(!result.includes('pointStart'), 'Should remove pointStart')
            assert.ok(!result.includes('pointEnd'), 'Should remove pointEnd')
        })

        it('should convert single dateOther and preserve attributes', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test Item</title></titleInfo>
                <origininfo>
                    <dateType>Other</dateType>
                    <dateOtherWrapper>
                        <dateOther encoding="w3cdtf" type="exhibit">2016-12-05</dateOther>
                    </dateOtherWrapper>
                </origininfo>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<dateOther encoding="w3cdtf" type="exhibit">2016-12-05</dateOther>'),
                'Should preserve single dateOther with its attributes')
            assert.ok(!result.includes('dateOtherWrapper'), 'Should remove wrapper')
        })

        it('should remove subjectType and fix relateditem case', () => {
            const input = `<xml><mods>
                <subject><subjectType>topic</subjectType><topic>Test</topic></subject>
                <relateditem><title>Test</title></relateditem>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('subjectType'))
            assert.ok(result.includes('<relatedItem>'))
            assert.ok(!result.includes('<relateditem>'))
        })

        it('should convert topicCONA to topic with authority', () => {
            const input = `<xml><mods>
                <subject><topicCONA>Architecture</topicCONA></subject>
                <subject><topicCONA>Sculpture</topicCONA></subject>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('topicCONA'), 'Should not contain topicCONA')
            assert.ok(result.includes('<topic authority="cona">Architecture</topic>'),
                'Should convert to topic with authority="cona"')
            assert.ok(result.includes('<topic authority="cona">Sculpture</topic>'))
        })

        it('should remove artstorClassification elements', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <artstorClassification authority="artstor">photographs</artstorClassification>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('artstorClassification'), 'Should remove artstorClassification')
            assert.ok(result.includes('<title>Test</title>'), 'Should preserve other content')
        })

        it('should wrap relatedItem/title with titleInfo', () => {
            const input = `<xml><mods>
                <relatedItem>
                    <title>Related Work Title</title>
                </relatedItem>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<relatedItem>'), 'Should have relatedItem')
            assert.ok(result.includes('<titleInfo>'), 'Should have titleInfo wrapper')
            assert.ok(result.includes('<title>Related Work Title</title>'), 'Should have title')
            assert.ok(result.includes('</titleInfo>'), 'titleInfo should be closed')
        })

        it('should move formBroad and formSpecific to genre', () => {
            const input = `<xml><mods>
                <physicalDescription>
                    <formBroad>correspondence</formBroad>
                    <formSpecific>personal</formSpecific>
                </physicalDescription>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('formBroad'), 'Should remove formBroad')
            assert.ok(!result.includes('formSpecific'), 'Should remove formSpecific')
            assert.ok(result.includes('<genre>correspondence</genre>'), 'Should have correspondence genre')
            assert.ok(result.includes('<genre>personal</genre>'), 'Should have personal genre')
        })

        it('should wrap language text with languageTerm and move authority', () => {
            const input = `<xml><mods>
                <language authority="iso639-2b">eng</language>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<language>'), 'Should have language')
            assert.ok(result.includes('<languageTerm authority="iso639-2b">eng</languageTerm>'),
                'Should wrap text with languageTerm and move authority')
            assert.ok(!result.includes('<language authority'),
                'Language should not have authority attribute')
        })

        it('should remove href attribute from accessCondition', () => {
            const input = `<xml><mods>
                <accessCondition href="https://creativecommons.org/licenses/by/4.0/" type="use and reproduction">CC-BY</accessCondition>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<accessCondition'), 'Should have accessCondition')
            assert.ok(!result.includes('href='), 'Should not have href attribute')
            assert.ok(result.includes('type="use and reproduction"'), 'Should preserve type attribute')
            assert.ok(result.includes('>CC-BY</accessCondition>'), 'Should preserve text content')
        })

        it('should remove all empty elements', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <originInfo><place/><publisher/><dateCreated>2024</dateCreated></originInfo>
                <genre/>
                <subject/>
                <note>Has content</note>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('<place'), 'Empty place should be removed')
            assert.ok(!result.includes('<publisher'), 'Empty publisher should be removed')
            assert.ok(!result.includes('<genre'), 'Empty genre should be removed')
            assert.ok(!result.includes('<subject'), 'Empty subject should be removed')
            assert.ok(result.includes('<originInfo>'), 'originInfo with content should be preserved')
            assert.ok(result.includes('<dateCreated>2024</dateCreated>'), 'dateCreated with content should be preserved')
            assert.ok(result.includes('<note>Has content</note>'), 'note with content should be preserved')
        })

        it('should move physicalDescriptionNote/note to physicalDescription/note', () => {
            const input = `<xml><mods>
                <physicalDescription>
                    <digitalOrigin>reformatted digital</digitalOrigin>
                </physicalDescription>
                <physicalDescriptionNote>
                    <note type="medium">marked draft</note>
                </physicalDescriptionNote>
                <physicalDescriptionNote>
                    <note type="condition">poor</note>
                </physicalDescriptionNote>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('physicalDescriptionNote'), 'physicalDescriptionNote wrapper should be removed')
            assert.ok(result.includes('<physicalDescription>'), 'Should have physicalDescription')
            assert.ok(result.includes('<note type="medium">marked draft</note>'), 'Should have medium note')
            assert.ok(result.includes('<note type="condition">poor</note>'), 'Should have condition note')
            assert.ok(result.includes('digitalOrigin'), 'Should preserve existing physicalDescription content')
        })

        it('should rename part/title to part/text', () => {
            const input = `<xml><mods>
                <part><title>filename.pdf</title></part>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<text>filename.pdf</text>'), 'Should rename title to text in part')
            assert.ok(!result.includes('<part><title>'), 'Should not have title directly in part')
        })

        it('should convert part/number to part/text with type="attachment-uuid"', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <part>
                    <title>Document.pdf</title>
                    <number>a3a5980a-2fcc-40af-a8bb-55ed42be0686</number>
                </part>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('<number>'), 'Should not contain number element')
            assert.ok(result.includes('<text type="attachment-uuid">a3a5980a-2fcc-40af-a8bb-55ed42be0686</text>'),
                'Should convert number to text with type="attachment-uuid"')
        })

        it('should move part/extent to part/extent/list', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <part>
                    <extent>10 pages</extent>
                </part>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('<extent>10 pages</extent>'), 'Should not have extent directly in part')
            assert.ok(result.includes('<extent><list>10 pages</list></extent>'),
                'Should move extent text to list/item structure')
        })

        it('should remove redundant numberB, numberC, numberD from part', () => {
            const input = `<xml><mods>
                <titleInfo><title>Journal Article</title></titleInfo>
                <part>
                    <number>eb0960c6-5594-41ee-a1da-df3cec309d89</number>
                    <numberB>3403-3413</numberB>
                    <numberC>20</numberC>
                    <numberD>4</numberD>
                </part>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('numberB'), 'Should not contain numberB')
            assert.ok(!result.includes('numberC'), 'Should not contain numberC')
            assert.ok(!result.includes('numberD'), 'Should not contain numberD')
            assert.ok(result.includes('<text type="attachment-uuid">eb0960c6-5594-41ee-a1da-df3cec309d89</text>'),
                'Should still have converted attachment UUID')
        })

        it('should rename part/title to part/text', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test Item</title></titleInfo>
                <part>
                    <title>filename.pdf</title>
                    <number>12345</number>
                </part>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<part>'), 'Should have part element')
            assert.ok(result.includes('<text>filename.pdf</text>'), 'Should rename title to text in part')
            assert.ok(!result.includes('<part><title>'), 'Should not have title directly in part')
        })

        it('should move photoClassification to subject/topic', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <photoClassification>architectural photography</photoClassification>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('photoClassification'), 'Should not have photoClassification')
            assert.ok(result.includes('<subject>'), 'Should have subject wrapper')
            assert.ok(result.includes('<topic authority="local">architectural photography</topic>'), 'Should have topic with authority')
        })

        it('should wrap relatedItem/title with titleInfo', () => {
        })

        it('should wrap relatedItem/title with titleInfo', () => {
            const input = `<xml><mods>
                <titleInfo><title>Main Item</title></titleInfo>
                <relatedItem type="host"><title>Parent Collection</title></relatedItem>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<relatedItem type="host"><titleInfo><title>Parent Collection</title></titleInfo></relatedItem>'),
                'Should wrap relatedItem title with titleInfo')
            assert.ok(!result.includes('<relatedItem type="host"><title>'),
                'Should not have direct title under relatedItem')
        })

        it('should move formBroad and formSpecific to genre', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test Item</title></titleInfo>
                <physicalDescription>
                    <formBroad>correspondence</formBroad>
                    <formSpecific>personal</formSpecific>
                    <digitalOrigin>born digital</digitalOrigin>
                </physicalDescription>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('formBroad'), 'Should not contain formBroad')
            assert.ok(!result.includes('formSpecific'), 'Should not contain formSpecific')
            assert.ok(result.includes('<genre>correspondence</genre>'), 'Should have genre from formBroad')
            assert.ok(result.includes('<genre>personal</genre>'), 'Should have genre from formSpecific')
            assert.ok(result.includes('digitalOrigin'), 'Should preserve other physicalDescription content')
        })

        it('should wrap originInfo/place text with placeTerm', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test Publication</title></titleInfo>
                <originInfo>
                    <place>Oakland, CA</place>
                    <publisher>Test Publisher</publisher>
                    <dateIssued>2024</dateIssued>
                </originInfo>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<place>'), 'Should have place element')
            assert.ok(result.includes('<placeTerm>Oakland, CA</placeTerm>'),
                'Should wrap place text with placeTerm')
            assert.ok(!result.includes('<place>Oakland, CA</place>'),
                'Should not have unwrapped text in place')
        })

        it('should handle empty place elements gracefully', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <originInfo>
                    <place/>
                    <publisher>Test Publisher</publisher>
                </originInfo>
            </mods></xml>`
            const result = toStrictMODS(input)

            // Empty place should be removed by removeEmptyElements
            assert.ok(!result.includes('<place'), 'Empty place should be removed')
        })

        it('should wrap subject/name text with namePart', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <subject>
                    <name authority="local" type="personal">Bruce, Tecoah P.</name>
                </subject>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<subject>'), 'Should have subject element')
            assert.ok(result.includes('<name authority="local" type="personal">'),
                'Should have name with preserved attributes')
            assert.ok(result.includes('<namePart>Bruce, Tecoah P.</namePart>'),
                'Should wrap name text with namePart')
            assert.ok(!result.includes('<name authority="local" type="personal">Bruce, Tecoah P.</name>'),
                'Should not have unwrapped text in name')
        })

        it('should handle multiple subject/name elements', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <subject>
                    <name authority="local" type="personal">Smith, John</name>
                </subject>
                <subject>
                    <name authority="local" type="corporate">ACME Corp</name>
                </subject>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<namePart>Smith, John</namePart>'),
                'Should wrap first name')
            assert.ok(result.includes('<namePart>ACME Corp</namePart>'),
                'Should wrap second name')
        })

        it('should convert namePartDate to namePart with type="date"', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test Item</title></titleInfo>
                <name type="personal" usage="primary">
                    <namePart>Doe, John</namePart>
                    <namePartDate>1920-2000</namePartDate>
                    <role><roleTerm>creator</roleTerm></role>
                </name>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('namePartDate'), 'Should not contain namePartDate')
            assert.ok(result.includes('<namePart type="date">1920-2000</namePart>'),
                'Should have namePart with type="date"')
            assert.ok(result.includes('<namePart>Doe, John</namePart>'),
                'Should preserve other namePart elements')
        })

        it('should handle multiple names with namePartDate', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test Item</title></titleInfo>
                <name type="personal">
                    <namePart>Smith, Jane</namePart>
                    <namePartDate>1930-2010</namePartDate>
                </name>
                <name type="corporate">
                    <namePart>University Press</namePart>
                    <namePartDate>1850-</namePartDate>
                </name>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(!result.includes('namePartDate'), 'Should not contain namePartDate')
            assert.ok(result.includes('<namePart type="date">1930-2010</namePart>'),
                'Should convert first namePartDate')
            assert.ok(result.includes('<namePart type="date">1850-</namePart>'),
                'Should convert second namePartDate')
        })

        it('should wrap languageOfCataloging with languageTerm and move authority', () => {
            const input = `<xml><mods>
                <titleInfo><title>Test</title></titleInfo>
                <recordInfo><languageOfCataloging authority="iso639-2b">eng</languageOfCataloging></recordInfo>
            </mods></xml>`
            const result = toStrictMODS(input)

            assert.ok(result.includes('<languageOfCataloging>'), 'Should have languageOfCataloging')
            assert.ok(result.includes('<languageTerm authority="iso639-2b">eng</languageTerm>'),
                'Should wrap text with languageTerm and move authority')
            assert.ok(!result.includes('<languageOfCataloging authority'),
                'LanguageOfCataloging should not have authority attribute')
        })
    })

    describe('Edge cases and error handling', () => {
        describe('unwrapDateCreated edge cases', () => {
            it('should remove wrapper with only pointStart (incomplete range)', () => {
                const input = `<xml><mods>
                    <origininfo>
                        <dateCreatedWrapper>
                            <dateCreated/>
                            <pointStart>2024-01</pointStart>
                            <pointEnd/>
                        </dateCreatedWrapper>
                    </origininfo>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                unwrapDateCreated(doc)

                const select = xpath.useNamespaces({})
                const wrappers = select('//origininfo/dateCreatedWrapper', doc)
                const dateElements = select('//origininfo/dateCreated', doc)

                assert.strictEqual(wrappers.length, 0, 'Wrapper should be removed')
                assert.strictEqual(dateElements.length, 0, 'No dateCreated should be created for incomplete range')
            })

            it('should remove wrapper with only pointEnd (incomplete range)', () => {
                const input = `<xml><mods>
                    <origininfo>
                        <dateCreatedWrapper>
                            <dateCreated/>
                            <pointStart/>
                            <pointEnd>2025-12</pointEnd>
                        </dateCreatedWrapper>
                    </origininfo>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                unwrapDateCreated(doc)

                const select = xpath.useNamespaces({})
                const wrappers = select('//origininfo/dateCreatedWrapper', doc)
                const dateElements = select('//origininfo/dateCreated', doc)

                assert.strictEqual(wrappers.length, 0, 'Wrapper should be removed')
                assert.strictEqual(dateElements.length, 0, 'No dateCreated should be created for incomplete range')
            })

            it('should handle whitespace-only values as empty', () => {
                const input = `<xml><mods>
                    <origininfo>
                        <dateCreatedWrapper>
                            <dateCreated>   </dateCreated>
                            <pointStart>  </pointStart>
                            <pointEnd>  </pointEnd>
                        </dateCreatedWrapper>
                    </origininfo>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                unwrapDateCreated(doc)

                const select = xpath.useNamespaces({})
                const wrappers = select('//origininfo/dateCreatedWrapper', doc)
                const dateElements = select('//origininfo/dateCreated', doc)

                assert.strictEqual(wrappers.length, 0, 'Wrapper should be removed')
                assert.strictEqual(dateElements.length, 0, 'No dateCreated should be created for whitespace-only values')
            })

            it('should handle mixed case: date value with whitespace', () => {
                const input = `<xml><mods>
                    <origininfo>
                        <dateCreatedWrapper>
                            <dateCreated keyDate="yes">  2024-05  </dateCreated>
                            <pointStart/>
                            <pointEnd/>
                        </dateCreatedWrapper>
                    </origininfo>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                unwrapDateCreated(doc)

                const select = xpath.useNamespaces({})
                const dateElements = select('//origininfo/dateCreated', doc)

                assert.strictEqual(dateElements.length, 1)
                assert.strictEqual(dateElements[0].textContent.trim(), '2024-05')
                assert.strictEqual(dateElements[0].getAttribute('keyDate'), 'yes')
            })

            it('should handle date range with whitespace in points', () => {
                const input = `<xml><mods>
                    <origininfo>
                        <dateCreatedWrapper>
                            <dateCreated/>
                            <pointStart>  2022-01  </pointStart>
                            <pointEnd>  2023-12  </pointEnd>
                        </dateCreatedWrapper>
                    </origininfo>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                unwrapDateCreated(doc)

                const select = xpath.useNamespaces({})
                const dateElements = select('//origininfo/dateCreated', doc)

                assert.strictEqual(dateElements.length, 1)
                assert.strictEqual(dateElements[0].textContent, '2022-01/2023-12')
                assert.strictEqual(dateElements[0].getAttribute('encoding'), 'edtf')
            })
        })

        describe('unwrapSimpleElement edge cases', () => {
            it('should handle wrapper with multiple children', () => {
                const input = `<xml><mods>
                    <typeOfResourceWrapper>
                        <typeOfResource>text</typeOfResource>
                        <typeOfResource>still image</typeOfResource>
                    </typeOfResourceWrapper>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                unwrapSimpleElement(doc, 'typeOfResourceWrapper')

                const select = xpath.useNamespaces({})
                const wrappers = select('//mods/typeOfResourceWrapper', doc)
                const resources = select('//mods/typeOfResource', doc)

                assert.strictEqual(wrappers.length, 0, 'Wrapper should be removed')
                assert.strictEqual(resources.length, 2, 'Both children should be preserved')
            })

            it('should handle nested wrappers', () => {
                const input = `<xml><mods>
                    <genreWrapper>
                        <genreWrapper>
                            <genre>photographs</genre>
                        </genreWrapper>
                    </genreWrapper>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                // First unwrap should remove outer wrapper
                unwrapSimpleElement(doc, 'genreWrapper')

                const result = doc.toString()

                // After unwrapping, genre should exist
                assert.ok(result.includes('<genre>photographs</genre>'))
                assert.ok(!result.includes('genreWrapper'))
            })

            it('should handle empty wrapper (no children)', () => {
                const input = `<xml><mods>
                    <typeOfResourceWrapper></typeOfResourceWrapper>
                    <titleInfo><title>Test</title></titleInfo>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                unwrapSimpleElement(doc, 'typeOfResourceWrapper')

                const select = xpath.useNamespaces({})
                const wrappers = select('//mods/typeOfResourceWrapper', doc)

                assert.strictEqual(wrappers.length, 0, 'Empty wrapper should be removed')
            })
        })

        describe('Error handling', () => {
            it('should handle malformed XML gracefully', () => {
                const malformedXML = '<xml><mods><unclosed>'

                // Should throw a parse error, not crash silently
                assert.throws(() => {
                    toStrictMODS(malformedXML)
                }, /error/i, 'Should throw an error for malformed XML')
            })

            it('should handle empty string input', () => {
                // Empty input should throw an error
                assert.throws(() => {
                    toStrictMODS('')
                }, /empty/i, 'Should throw an error for empty input')
            })

            it('should handle whitespace-only input', () => {
                assert.throws(() => {
                    toStrictMODS('   \n\t  ')
                }, /empty/i, 'Should throw an error for whitespace-only input')
            })

            it('should handle null input', () => {
                assert.throws(() => {
                    toStrictMODS(null)
                }, /must be a string/i, 'Should throw an error for null input')
            })

            it('should handle undefined input', () => {
                assert.throws(() => {
                    toStrictMODS(undefined)
                }, /must be a string/i, 'Should throw an error for undefined input')
            })

            it('should handle non-string input', () => {
                assert.throws(() => {
                    toStrictMODS({xml: 'test'})
                }, /must be a string/i, 'Should throw an error for object input')

                assert.throws(() => {
                    toStrictMODS(123)
                }, /must be a string/i, 'Should throw an error for number input')
            })

            it('should handle XML without mods element', () => {
                const input = '<xml><other>content</other></xml>'
                const result = toStrictMODS(input)

                // Should not crash, just return the document as-is
                assert.ok(result.includes('content'))
            })
        })

        describe('renameElement XPath behavior', () => {
            it('should rename direct children only with default XPath', () => {
                const input = `<xml><mods>
                    <origininfo>
                        <place/>
                    </origininfo>
                    <subject>
                        <origininfo>
                            <nested/>
                        </origininfo>
                    </subject>
                </mods></xml>`
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                // Default context searches from //mods with / (direct child)
                renameElement(doc, 'origininfo', 'originInfo')

                const result = doc.toString()

                // Direct child under mods should be renamed
                const select = xpath.useNamespaces({})
                const originInfos = select('//mods/originInfo', doc)

                assert.strictEqual(originInfos.length, 1, 'Should rename direct child')
            })

            it('should handle elements with no parent gracefully', () => {
                const parser = new xmldom()
                const doc = parser.parseFromString('<xml><mods></mods></xml>', 'text/xml')

                // Try to rename element that doesn't exist
                assert.doesNotThrow(() => {
                    renameElement(doc, 'nonexistent', 'newName')
                })
            })
        })

        describe('removeElement edge cases', () => {
            it('should handle removing non-existent elements', () => {
                const input = '<xml><mods><title>Test</title></mods></xml>'
                const parser = new xmldom()
                const doc = parser.parseFromString(input, 'text/xml')

                assert.doesNotThrow(() => {
                    removeElement(doc, 'nonexistent')
                })

                const result = doc.toString()
                assert.ok(result.includes('<title>Test</title>'), 'Original content should be preserved')
            })
        })
    })
})
