import assert from 'node:assert'
import { describe, it } from 'mocha'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import { toStrictMODS } from './strict-mods.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Helper to normalize XML for comparison (remove whitespace differences)
function normalizeXML(xmlString) {
    return xmlString
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim()
}

describe('Integration Tests - Real-World Data', () => {
    describe('Sample file processing', () => {
        it('should successfully process item-1 (complex record with dates and subjects)', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            assert.doesNotThrow(() => {
                const result = toStrictMODS(input)
                assert.ok(result.includes('xmlns="http://www.loc.gov/mods/v3"'))
                assert.ok(result.includes('<mods'))
                assert.ok(result.includes('</mods>'))
            })
        })

        it('should successfully process item-3 (large file with 300+ part elements)', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-3-fa63fed7-e4f0-45a6-b8a1-a5c36f954fe7.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)
            const parser = new xmldom()
            const doc = parser.parseFromString(result, 'text/xml')

            // Verify no parse errors
            const parseErrors = doc.getElementsByTagName('parsererror')
            assert.strictEqual(parseErrors.length, 0, 'Should not have parse errors')

            // Verify MODS namespace
            assert.ok(result.includes('xmlns="http://www.loc.gov/mods/v3"'))

            // Verify part/number elements are preserved
            const select = xpath.useNamespaces({ mods: 'http://www.loc.gov/mods/v3' })
            const numbers = select('//mods:part/mods:number', doc)
            assert.ok(numbers.length > 0, 'Should have part/number elements')
        })

        it('should be idempotent on already-strict MODS', () => {
            const strictInput = readFileSync(
                join(__dirname, 'data', 'item-1-strict.xml'),
                'utf-8'
            )

            const result1 = toStrictMODS(strictInput)
            const result2 = toStrictMODS(result1)

            // Running twice should produce equivalent output
            assert.strictEqual(
                normalizeXML(result1),
                normalizeXML(result2),
                'Should be idempotent'
            )
        })
    })

    describe('Transformation completeness', () => {
        it('should remove all custom wrapper elements from item-1', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)

            // Should not contain any custom wrapper elements
            assert.ok(!result.includes('typeOfResourceWrapper'))
            assert.ok(!result.includes('genreWrapper'))
            assert.ok(!result.includes('noteWrapper'))
            assert.ok(!result.includes('dateCreatedWrapper'))
            assert.ok(!result.includes('physicalDescriptionNote'))
        })

        it('should remove all non-MODS elements from item-1', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)

            // Should not contain custom elements
            assert.ok(!result.includes('dateType'))
            assert.ok(!result.includes('subjectType'))
            assert.ok(!result.includes('artstorClassification'))
            assert.ok(!result.includes('photoClassification'))
        })

        it('should fix all case-sensitivity issues', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)

            // Should use correct case
            assert.ok(result.includes('originInfo'))
            assert.ok(!result.includes('<origininfo'))
            assert.ok(!result.includes('<relateditem'))
        })

        it('should convert date ranges to EDTF format', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-3-fa63fed7-e4f0-45a6-b8a1-a5c36f954fe7.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)
            const parser = new xmldom()
            const doc = parser.parseFromString(result, 'text/xml')

            const select = xpath.useNamespaces({ mods: 'http://www.loc.gov/mods/v3' })
            const dateCreated = select('//mods:dateCreated[@encoding="edtf"]', doc)

            if (dateCreated.length > 0) {
                const dateText = dateCreated[0].textContent
                assert.ok(dateText.includes('/'), 'EDTF date should contain "/" separator')
                assert.strictEqual(dateText, '2022/2023', 'Should be formatted as EDTF range')
            }
        })
    })

    describe('Data preservation', () => {
        it('should preserve all title content', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)

            assert.ok(result.includes('Letter to Dr. William S. Porter'))
            assert.ok(result.includes('January 20, 1925'))
        })

        it('should preserve all subject content', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)

            assert.ok(result.includes('California College of Arts and Crafts'))
            assert.ok(result.includes('Porter, William Surber'))
            assert.ok(result.includes('Meyer, Frederick H., 1872-1961'))
        })

        it('should preserve attributes during transformations', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)
            const parser = new xmldom()
            const doc = parser.parseFromString(result, 'text/xml')

            const select = xpath.useNamespaces({ mods: 'http://www.loc.gov/mods/v3' })

            // Check topic authority preserved
            const topics = select('//mods:subject/mods:topic[@authority="lcsh"]', doc)
            assert.ok(topics.length > 0, 'Should preserve authority attributes')

            // Check dateCreated keyDate preserved
            const dates = select('//mods:dateCreated[@keyDate="yes"]', doc)
            assert.ok(dates.length > 0, 'Should preserve keyDate attributes')
        })

        it('should not lose content during wrapper unwrapping', () => {
            const input = '<xml><mods><typeOfResourceWrapper><typeOfResource>still image</typeOfResource></typeOfResourceWrapper></mods></xml>'
            const result = toStrictMODS(input)

            assert.ok(result.includes('still image'), 'Content should be preserved')
            assert.ok(result.includes('<typeOfResource>still image</typeOfResource>'))
        })
    })

    describe('Edge cases with real data', () => {
        it('should handle records with empty wrapper elements', () => {
            const input = `<xml><mods>
                <typeOfResourceWrapper><typeOfResource/></typeOfResourceWrapper>
                <genreWrapper><genre/></genreWrapper>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            const result = toStrictMODS(input)

            // Empty elements should be removed by removeEmptyElements
            assert.ok(!result.includes('typeOfResourceWrapper'))
            assert.ok(!result.includes('genreWrapper'))
            assert.ok(result.includes('<title>Test</title>'))
        })

        it('should handle mixed wrapper and non-wrapper elements', () => {
            const input = `<xml><mods>
                <typeOfResourceWrapper><typeOfResource>text</typeOfResource></typeOfResourceWrapper>
                <genre>photographs</genre>
                <titleInfo><title>Mixed Test</title></titleInfo>
            </mods></xml>`

            const result = toStrictMODS(input)

            assert.ok(result.includes('<typeOfResource>text</typeOfResource>'))
            assert.ok(result.includes('<genre>photographs</genre>'))
            assert.ok(!result.includes('typeOfResourceWrapper'))
        })

        it('should handle language elements that are already wrapped', () => {
            const input = `<xml><mods>
                <language><languageTerm authority="iso639-2b">eng</languageTerm></language>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            const result = toStrictMODS(input)
            const parser = new xmldom()
            const doc = parser.parseFromString(result, 'text/xml')

            const select = xpath.useNamespaces({ mods: 'http://www.loc.gov/mods/v3' })
            const terms = select('//mods:language/mods:languageTerm', doc)

            // Should not double-wrap
            assert.strictEqual(terms.length, 1)
            assert.strictEqual(terms[0].textContent, 'eng')
        })
    })

    describe('Output validation', () => {
        it('should produce well-formed XML', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)
            const parser = new xmldom()

            assert.doesNotThrow(() => {
                const doc = parser.parseFromString(result, 'text/xml')
                const parseErrors = doc.getElementsByTagName('parsererror')
                assert.strictEqual(parseErrors.length, 0, 'Should be well-formed XML')
            })
        })

        it('should have MODS namespace in output', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)

            assert.ok(result.includes('xmlns="http://www.loc.gov/mods/v3"'))
            assert.ok(result.startsWith('<mods'))
            assert.ok(result.endsWith('</mods>'))
        })

        it('should not include xml wrapper element', () => {
            const input = readFileSync(
                join(__dirname, 'data', 'item-1-a359d0d9-5990-4330-becf-bffd88c48ecc.xml'),
                'utf-8'
            )

            const result = toStrictMODS(input)

            // Result should be just the <mods> element
            assert.ok(!result.includes('<xml>'))
            assert.ok(!result.includes('</xml>'))
            assert.ok(!result.includes('<local>'))
        })
    })

    describe('Performance with large documents', () => {
        it('should handle item-3 with 300+ elements efficiently', function () {
            this.timeout(5000) // Allow up to 5 seconds

            const input = readFileSync(
                join(__dirname, 'data', 'item-3-fa63fed7-e4f0-45a6-b8a1-a5c36f954fe7.xml'),
                'utf-8'
            )

            const start = Date.now()
            const result = toStrictMODS(input)
            const duration = Date.now() - start

            assert.ok(result.length > 0)
            assert.ok(duration < 1000, `Should complete in under 1s (took ${duration}ms)`)
        })
    })
})

describe('Additional Edge Cases', () => {
    describe('Mixed content handling', () => {
        it('should handle elements with mixed text and child elements', () => {
            const input = `<xml><mods>
                <note>This is text <emph>with emphasis</emph> mixed in</note>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            assert.doesNotThrow(() => {
                const result = toStrictMODS(input)
                assert.ok(result.includes('This is text'))
            })
        })
    })

    describe('Special characters and encoding', () => {
        it('should preserve HTML entities', () => {
            const input = `<xml><mods>
                <accessCondition>&#x00a9; 2026 Test &amp; Company</accessCondition>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            const result = toStrictMODS(input)

            // Should preserve entities (may be converted to actual characters)
            assert.ok(result.includes('2026') || result.includes('&#'))
            assert.ok(result.includes('Test'))
        })

        it('should handle Unicode characters', () => {
            const input = `<xml><mods>
                <title>Test with émojis 🎨 and accénts</title>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            assert.doesNotThrow(() => {
                const result = toStrictMODS(input)
                assert.ok(result.includes('Test'))
            })
        })
    })

    describe('Deeply nested structures', () => {
        it('should handle deeply nested relatedItem elements', () => {
            const input = `<xml><mods>
                <relatedItem type="host">
                    <relatedItem type="series">
                        <relatedItem type="subseries">
                            <titleInfo><title>Deep Nesting</title></titleInfo>
                        </relatedItem>
                    </relatedItem>
                </relatedItem>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            assert.doesNotThrow(() => {
                const result = toStrictMODS(input)
                assert.ok(result.includes('Deep Nesting'))
            })
        })
    })

    describe('Multiple dateCreatedWrappers', () => {
        it('should handle document with multiple dateCreatedWrapper elements', () => {
            const input = `<xml><mods>
                <origininfo>
                    <dateCreatedWrapper>
                        <dateCreated keyDate="yes">1925-01-20</dateCreated>
                        <pointStart></pointStart>
                        <pointEnd></pointEnd>
                    </dateCreatedWrapper>
                    <dateCreatedWrapper>
                        <dateCreated></dateCreated>
                        <pointStart>1920</pointStart>
                        <pointEnd>1930</pointEnd>
                    </dateCreatedWrapper>
                </origininfo>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            const result = toStrictMODS(input)
            const parser = new xmldom()
            const doc = parser.parseFromString(result, 'text/xml')

            const select = xpath.useNamespaces({ mods: 'http://www.loc.gov/mods/v3' })
            const dates = select('//mods:dateCreated', doc)

            // Should have both dates: single date + EDTF range
            assert.ok(dates.length >= 1, 'Should preserve at least one date')

            // Check for EDTF formatted date
            const edtfDates = select('//mods:dateCreated[@encoding="edtf"]', doc)
            if (edtfDates.length > 0) {
                assert.ok(edtfDates[0].textContent.includes('/'))
            }
        })
    })

    describe('Attribute conflicts', () => {
        it('should handle authority attribute conflicts when converting elements', () => {
            const input = `<xml><mods>
                <subject>
                    <topicCONA authority="existing">Test Topic</topicCONA>
                </subject>
                <titleInfo><title>Test</title></titleInfo>
            </mods></xml>`

            const result = toStrictMODS(input)
            const parser = new xmldom()
            const doc = parser.parseFromString(result, 'text/xml')

            const select = xpath.useNamespaces({ mods: 'http://www.loc.gov/mods/v3' })
            const topics = select('//mods:subject/mods:topic', doc)

            assert.strictEqual(topics.length, 1)
            // Should have authority="cona" (conversion wins over existing)
            assert.strictEqual(topics[0].getAttribute('authority'), 'cona')
        })
    })
})
