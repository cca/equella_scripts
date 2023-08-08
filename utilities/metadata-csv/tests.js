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
})
