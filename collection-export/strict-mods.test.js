import assert from 'node:assert'
import { describe, it } from 'mocha'
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'

import { unwrapSimpleElement, unwrapDateCreated, renameElement, removeElement, toStrictMODS } from './strict-mods.js'

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
    
    describe('toStrictMODS', () => {
        it('should convert XML string with typeOfResourceWrapper', () => {
            const result = normalizeXML(toStrictMODS(fixtures.typeOfResourceWrapper.input))
            const expected = normalizeXML(fixtures.typeOfResourceWrapper.expected)
            
            assert.strictEqual(result, expected)
        })
        
        it('should convert XML string with genreWrapper', () => {
            const result = normalizeXML(toStrictMODS(fixtures.genreWrapper.input))
            const expected = normalizeXML(fixtures.genreWrapper.expected)
            
            assert.strictEqual(result, expected)
        })
        
        it('should convert XML string with noteWrapper', () => {
            const result = normalizeXML(toStrictMODS(fixtures.noteWrapper.input))
            const expected = normalizeXML(fixtures.noteWrapper.expected)
            
            assert.strictEqual(result, expected)
        })
        
        it('should convert XML with all wrapper types', () => {
            const result = normalizeXML(toStrictMODS(fixtures.allWrappers.input))
            const expected = normalizeXML(fixtures.allWrappers.expected)
            
            assert.strictEqual(result, expected)
        })
        
        it('should convert single date with originInfo case fix', () => {
            const result = normalizeXML(toStrictMODS(fixtures.dateCreatedSingle.input))
            const expected = normalizeXML(fixtures.dateCreatedSingle.expected)
            
            assert.strictEqual(result, expected)
        })
        
        it('should convert date range to EDTF', () => {
            const result = normalizeXML(toStrictMODS(fixtures.dateCreatedRange.input))
            const expected = normalizeXML(fixtures.dateCreatedRange.expected)
            
            assert.strictEqual(result, expected)
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
    })
})
