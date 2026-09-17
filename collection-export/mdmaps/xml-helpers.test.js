import assert from 'node:assert'
import { describe, it } from 'mocha'
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'

import { addAccessCondition, addArchivesSeries, addRoleTerm, hasDirectTextContent, renameElement, safeSelect, safeSelectFirst } from './xml-helpers.js'

describe('XML Helpers', () => {
    describe('addAccessCondition', () => {
        it('should use the default restriction-on-access type', () => {
            const doc = new xmldom().parseFromString('<mods/>', 'text/xml')

            addAccessCondition(doc, 'Available by appointment')

            const accessCondition = xpath.select1('//mods/accessCondition', doc)
            assert.strictEqual(accessCondition.getAttribute('type'), 'restriction on access')
        })

        it('should allow use-and-reproduction type', () => {
            const doc = new xmldom().parseFromString('<mods/>', 'text/xml')

            addAccessCondition(doc, 'Permission required for reuse', 'use and reproduction')

            const accessCondition = xpath.select1('//mods/accessCondition', doc)
            assert.strictEqual(accessCondition.getAttribute('type'), 'use and reproduction')
        })

        it('should reject unsupported types', () => {
            const doc = new xmldom().parseFromString('<mods/>', 'text/xml')

            assert.throws(
                () => addAccessCondition(doc, 'Available by appointment', 'invalid'),
                /Unsupported access condition type: invalid/,
            )
        })

        it('should not add empty text accessConditions', () => {
            const doc = new xmldom().parseFromString('<mods/>', 'text/xml')
            const accessCondition = addAccessCondition(doc, '')
            assert.strictEqual(accessCondition, null)
            const accessConditionInDoc = xpath.select1('//mods/accessCondition', doc)
            assert.strictEqual(accessConditionInDoc, undefined)
        })

        it('should not clobber existing accessConditions', () => {
            const acText = 'Do not'
            const doc = new xmldom().parseFromString(`<mods><accessCondition type="use and reproduction">${acText}</accessCondition></mods>`, 'text/xml')
            const newAcText = 'Available by appointment'
            addAccessCondition(doc, newAcText)

            const accessConditions = xpath.select('//mods/accessCondition', doc)
            assert.strictEqual(accessConditions.length, 2)
            assert.strictEqual(accessConditions[0].getAttribute('type'), 'use and reproduction')
            assert.strictEqual(accessConditions[0].textContent, acText)
            assert.strictEqual(accessConditions[1].getAttribute('type'), 'restriction on access')
            assert.strictEqual(accessConditions[1].textContent, newAcText)
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
            const input = `<xml><mods>
                <relateditem type="host"><title>Host Title</title></relateditem>
                <titleInfo><title>Test Item</title></titleInfo>
            </mods></xml>`
            const doc = parser.parseFromString(input, 'text/xml')

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

        it('should handle null document', () => {
            const result = renameElement(null, 'oldname', 'newName')
            assert.strictEqual(result, null)
        })
    })

    describe('addRoleTerm', () => {
        const authority = 'marcrelator'
        const authorityURI = 'http://id.loc.gov/vocabulary/relators'

        it('should add a role/roleTerm element with authority and type attributes', () => {
            const doc = new xmldom().parseFromString('<mods></mods>', 'text/xml')
            const valueURI = 'http://id.loc.gov/vocabulary/relators/tch'
            addRoleTerm(doc.documentElement, 'teacher', valueURI)
            const roleTerm = xpath.select1('//mods/role/roleTerm', doc)
            assert.ok(roleTerm)
            assert.strictEqual(roleTerm.textContent, 'teacher')
            assert.strictEqual(roleTerm.getAttribute('authority'), authority)
            assert.strictEqual(roleTerm.getAttribute('authorityURI'), authorityURI)
            assert.strictEqual(roleTerm.getAttribute('valueURI'), valueURI)
        })

        it('should work without a valueURI', () => {
            const doc = new xmldom().parseFromString('<mods></mods>', 'text/xml')
            addRoleTerm(doc.documentElement, 'teacher')
            const roleTerm = xpath.select1('//mods/role/roleTerm', doc)
            assert.ok(roleTerm)
            assert.strictEqual(roleTerm.textContent, 'teacher')
            assert.strictEqual(roleTerm.getAttribute('authority'), authority)
            assert.strictEqual(roleTerm.getAttribute('authorityURI'), authorityURI)
        })

        it('should return null when parent is not provided', () => {
            assert.strictEqual(addRoleTerm(null, 'teacher'), null)
        })

        it('should return null when roleTerm is not provided', () => {
            const doc = new xmldom().parseFromString('<mods></mods>', 'text/xml')
            assert.strictEqual(addRoleTerm(doc.documentElement, null), null)
        })
    })

    describe('hasDirectTextContent', () => {
        it('should return true for element with direct text content', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<root>Some text</root>', 'text/xml')
            const root = doc.documentElement

            assert.strictEqual(hasDirectTextContent(root), true)
        })

        it('should return false for element with only child elements', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<root><child>Text</child></root>', 'text/xml')
            const root = doc.documentElement

            assert.strictEqual(hasDirectTextContent(root), false)
        })

        it('should return false for element with only whitespace', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<root>   \n\t  </root>', 'text/xml')
            const root = doc.documentElement

            assert.strictEqual(hasDirectTextContent(root), false)
        })

        it('should return false for empty element', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<root/>', 'text/xml')
            const root = doc.documentElement

            assert.strictEqual(hasDirectTextContent(root), false)
        })

        it('should return true for element with mixed content including text', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<root>Text before<child>nested</child>text after</root>', 'text/xml')
            const root = doc.documentElement

            assert.strictEqual(hasDirectTextContent(root), true)
        })

        it('should return false for null element', () => {
            assert.strictEqual(hasDirectTextContent(null), false)
        })

        it('should return false for undefined element', () => {
            assert.strictEqual(hasDirectTextContent(undefined), false)
        })

        it('should return true for element with only direct text nodes', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<location>California</location>', 'text/xml')
            const location = doc.documentElement

            assert.strictEqual(hasDirectTextContent(location), true)
        })

        it('should return false for element with text in child only', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<location><url>http://example.com</url></location>', 'text/xml')
            const location = doc.documentElement

            assert.strictEqual(hasDirectTextContent(location), false)
        })
    })

    describe('safeSelect', () => {
        it('should return empty array for null document', () => {
            const result = safeSelect('//mods', null)
            assert.deepStrictEqual(result, [])
        })

        it('should return empty array for undefined document', () => {
            const result = safeSelect('//mods', undefined)
            assert.deepStrictEqual(result, [])
        })

        it('should return empty array for XPath with no matches', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = safeSelect('//invalid_xpath', doc)
            assert.deepStrictEqual(result, [])
        })

        it('should return matching elements for valid XPath', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/><mods/></xml>', 'text/xml')
            const result = safeSelect('//mods', doc)
            assert.strictEqual(result.length, 2)
        })

        it('should not return elements without parents', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<mods><child/></mods>', 'text/xml')
            const child = xpath.select1("//child", doc)
            // Manually remove the parent to simulate an orphaned element
            child.parentNode.parentNode.removeChild(child.parentNode)
            assert.deepStrictEqual(safeSelect('//child', doc), [])
        })
    })

    describe('safeSelectFirst', () => {
        it('should return null for null document', () => {
            const result = safeSelectFirst('//mods', null)
            assert.strictEqual(result, null)
        })

        it('should return null for XPath with no matches', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = safeSelectFirst('//invalid_xpath', doc)
            assert.strictEqual(result, null)
        })

        it('should return the first matching element for valid XPath', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/><mods/></xml>', 'text/xml')
            const modsElements = xpath.select('//mods', doc)
            const firstMods = safeSelectFirst('//mods', doc)
            assert.ok(firstMods)
            assert.strictEqual(firstMods.nodeName, 'mods')
            assert.deepEqual(firstMods, modsElements[0])
        })
    })

    describe('addArchivesSeries', () => {
        it('should return null and add nothing if both series & subseries are empty', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = addArchivesSeries(doc, '', '')
            assert.strictEqual(result, null)
            assert.strictEqual(xpath.select1('//mods/relatedItem', doc), undefined)
        })

        it('should return null and add nothing when series & subseries are omitted', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = addArchivesSeries(doc)
            assert.strictEqual(result, null)
            assert.strictEqual(xpath.select1('//mods/relatedItem', doc), undefined)
        })

        it('should return null when there is no <mods> element', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml/>', 'text/xml')
            const result = addArchivesSeries(doc, 'VII. Press', '1. Press Clippings')
            assert.strictEqual(result, null)
        })

        it('should add a single relatedItem@displayLabel=series when only series is given', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = addArchivesSeries(doc, 'VII. Press')
            assert.ok(result)
            const relatedItem = xpath.select1('//mods/relatedItem', doc)
            assert.ok(relatedItem)
            assert.strictEqual(relatedItem.getAttribute('type'), 'series')
            assert.strictEqual(relatedItem.getAttribute('displayLabel'), 'series')
            assert.strictEqual(xpath.select("string(titleInfo/title)", relatedItem), 'VII. Press')
            // no nested relatedItem
            assert.strictEqual(xpath.select1('relatedItem', relatedItem), undefined)
        })

        it('should add a single relatedItem@displayLabel=subseries when only subseries is given', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = addArchivesSeries(doc, '', '1. Press Clippings')
            assert.ok(result)
            const relatedItem = xpath.select1('//mods/relatedItem', doc)
            assert.ok(relatedItem)
            assert.strictEqual(relatedItem.getAttribute('type'), 'series')
            assert.strictEqual(relatedItem.getAttribute('displayLabel'), 'subseries')
            assert.strictEqual(xpath.select("string(titleInfo/title)", relatedItem), '1. Press Clippings')
        })

        it('should nest a series relatedItem inside a subseries relatedItem when both are given', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = addArchivesSeries(doc, 'VII. Press', '1. Press Clippings')
            assert.ok(result)
            const outer = xpath.select1('//mods/relatedItem', doc)
            assert.ok(outer)
            assert.strictEqual(outer.getAttribute('displayLabel'), 'subseries')
            assert.strictEqual(xpath.select("string(titleInfo/title)", outer), '1. Press Clippings')

            const inner = xpath.select1('relatedItem', outer)
            assert.ok(inner)
            assert.strictEqual(inner.getAttribute('type'), 'series')
            assert.strictEqual(inner.getAttribute('displayLabel'), 'series')
            assert.strictEqual(xpath.select("string(titleInfo/title)", inner), 'VII. Press')
        })

        it('should trim whitespace from series & subseries text', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            addArchivesSeries(doc, '  VII. Press  ', '  1. Press Clippings  ')
            const outer = xpath.select1('//mods/relatedItem', doc)
            assert.strictEqual(xpath.select("string(titleInfo/title)", outer), '1. Press Clippings')
            const inner = xpath.select1('relatedItem', outer)
            assert.strictEqual(xpath.select("string(titleInfo/title)", inner), 'VII. Press')
        })

        it('should treat whitespace-only strings as empty', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods/></xml>', 'text/xml')
            const result = addArchivesSeries(doc, '   ', '   ')
            assert.strictEqual(result, null)
            assert.strictEqual(xpath.select1('//mods/relatedItem', doc), undefined)
        })

        it('should append the archives series relatedItem after existing mods content', () => {
            const parser = new xmldom()
            const doc = parser.parseFromString('<xml><mods><titleInfo><title>Existing</title></titleInfo></mods></xml>', 'text/xml')
            addArchivesSeries(doc, 'VII. Press', '1. Press Clippings')
            const mods = xpath.select1('//mods', doc)
            assert.strictEqual(mods.childNodes[0].nodeName, 'titleInfo')
            assert.strictEqual(mods.childNodes[1].nodeName, 'relatedItem')
        })
    })
})
