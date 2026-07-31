import assert from 'node:assert'
import { describe, it } from 'mocha'
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'

import { unwrapSimpleElement, unwrapDateCreated, renameElement, removeElement, convertAuthorityElement, toStrictMODS } from './strict-mods.js'

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
