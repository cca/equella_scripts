/* globals describe,it,before,after */
import assert from 'node:assert'

import { checkPathPrefixes, prepChanges, makeChangesHash } from './modify.js'

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
    it('works with relative paths (no slash at the start)', () => {
        let cols = ['uuid', 'version', 'path']
        assert(checkPathPrefixes(cols))
    })
    it('throws with absolute paths that do not start with /xml', () => {
        let cols = ['uuid', 'version', '/mods/path']
        assert.throws(() => {checkPathPrefixes(cols)})
    })
})
