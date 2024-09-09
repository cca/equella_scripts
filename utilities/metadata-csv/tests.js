/* globals describe,it,before,after */
import assert from 'node:assert'

import { DOMParser } from '@xmldom/xmldom'
import xpath from 'xpath'

import { checkPathPrefixes, insertNewElement, prepChanges, makeChangesHash } from './modify.js'

describe('Changes Hash', () => {
    it('makes a hash from column headers & a row', () => {
        let cols = ['uuid', 'version', '/xml/path'],
            row = ['abcd', '1', 'value'],
            changes = makeChangesHash(cols, row)

        assert(changes.uuid === row[0])
        assert(changes.version === row[1])
        assert(changes['/xml/path'] === row[2])
    })
    it('consistent access to lowercase "uuid" & "version" in hash', () => {
        let cols = ['UUID', 'Version', '/xml/path'],
            row = ['abcd', '1', 'value'],
            changes = makeChangesHash(cols, row)

        assert(changes.uuid === row[0])
        assert(changes.version === row[1])
    })
    it('throws error if we do not have UUID & version columns', () => {
        // we will have an empty columns array
        let cols = [],
            row = ['abcd', '1', 'value']

        assert.throws(() => { makeChangesHash(cols, row) })
    })
})

describe('Ensure XPaths work', () => {
    it('works with paths that start with /xml', () => {
        let cols = ['uuid', 'version', '/xml/path']
        assert(checkPathPrefixes(cols))
    })
    it('works with relative paths ("//" at the start)', () => {
        let cols = ['uuid', 'version', '//path']
        assert(checkPathPrefixes(cols))
    })
    it('throws with relative paths that do not start with //', () => {
        let cols = ['uuid', 'version', 'mods/path']
        assert.throws(() => { checkPathPrefixes(cols) })
    })
    it('throws with absolute paths that do not start with /xml', () => {
        let cols = ['uuid', 'version', '/mods/path']
        assert.throws(() => {checkPathPrefixes(cols)})
    })
})

describe('Apply XML Changes', () => {
    it('recognizes when there are no changes to make', () => {
        let value ="oldValue",
            changes = { uuid: "a", version: "1", "/xml/path": value },
            xml = `<xml><path>${value}</path></xml>`,
            item = { metadata: xml }

        assert(prepChanges(item, changes) === null)
    })
    it('treats empty string cell as no change', () => {
        let changes = { uuid: "a", version: "1", "/xml/path": "" },
            xml = `<xml></xml>`,
            item = { metadata: xml }

        assert(prepChanges(item, changes) === null)
    })
    it('edits value ("/xml" absolute path)', () => {
        let xp = "/xml/path",
            value = "newValue",
            changes = { uuid: "a", version: "1" },
            xml = `<xml><path>oldValue</path></xml>`,
            item = { metadata: xml }

        changes[xp] = value
        let changedXML = prepChanges(item, changes)
        assert.equal(xpath.select(`string(${xp})`, changedXML), value)
    })
    it('edits value ("//" relative path)', () => {
        let xp = "//twopart/path",
            value = "newValue",
            changes = { uuid: "a", version: "1" },
            xml = `<xml><twopart><path>oldValue</path></twopart></xml>`,
            item = { metadata: xml }

        changes[xp] = value
        let changedXML = prepChanges(item, changes)
        assert.equal(xpath.select(`string(${xp})`, changedXML), value)
    })
})

describe('Insert new XML elements', () => {
    const xmldom = new DOMParser()
    it('inserts when the parent element exists', () => {
        let doc = xmldom.parseFromString('<xml><parent></parent></xml>', 'text/xml')
        const path = '/xml/parent/child'
        const value = 'text string'
        insertNewElement(doc, path, value)
        const element = xpath.select1(path, doc)
        assert.ok(element)
        assert.equal(element.textContent, value)
    })
    it('inserts when the parent element does not exist', () => {
        let doc = xmldom.parseFromString('<xml></xml>', 'text/xml')
        const path = '/xml/parent/child'
        const value = 'text string'
        insertNewElement(doc, path, value)
        const element = xpath.select1(path, doc)
        assert.ok(element)
        assert.equal(element.textContent, value)
    })
    it('inserts when the the parent and grandparent elements do not exist', () => {
        let doc = xmldom.parseFromString('<xml></xml>', 'text/xml')
        const path = '/xml/grandparent/parent/child'
        const value = 'text string'
        insertNewElement(doc, path, value)
        const element = xpath.select1(path, doc)
        assert.ok(element)
        assert.equal(element.textContent, value)
    })
})
