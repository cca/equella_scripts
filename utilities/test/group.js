/* globals describe,it,before,after */
import assert from 'node:assert'

import rc from 'rc'

import { getGroupByUUID, getGroupByName, addUsersToGroup, rmUsersFromGroup } from '../group.js'

const opts = rc('group', {})

describe('Get groups', () => {
    it('should get groups by UUID', async function () {
        this.timeout(10000)
        const group = await getGroupByUUID(opts.test_group_uuid)
        assert.ok(group)
        assert.equal(group.id, opts.test_group_uuid)
        assert.ok(Array.isArray(group.users))
    })

    it('should get groups by name', async function () {
        this.timeout(10000)
        const group = await getGroupByName(opts.test_group_name)
        assert.ok(group)
        assert.equal(group.name, opts.test_group_name)
        assert.ok(Array.isArray(group.users))
    })
})

// describe('Add and remove users from groups', () => {
//     it('should add a user to a group', async function () {})

//     it('should remove a user from a group', async function () { })
// })
