/* globals describe,it */
const assert = require('assert')

const fetch = require('node-fetch')

// NOTE: requires a separate config file for tests that's
// _in the root_ of this project (since `npm test` runs from root)
// see example.testretentionrc & fill in token & SMTP credentials
const options = require('rc')('testretention')
const Item = require('../item.js')
const contact = require('../contact')
const del = require('../del')
const items = {
    award: new Item(require('./fixtures/award.json'), options),
    commaInTitle: new Item(require('./fixtures/comma-in-title.json'), options),
    excluded: new Item(require('./fixtures/excluded-collection.json'), options),
    highRated: new Item(require('./fixtures/high-rating.json'), options),
    old: new Item(require('./fixtures/old-item.json'), options),
    recent: new Item(require('./fixtures/recent-item.json'), options),
    recentAndExcluded: new Item(require('./fixtures/recent-and-excluded.json'), options),
    untitled: new Item(require('./fixtures/untitled.json'), options),
}

describe('Identify items', () => {
    it('should mark for removal items that are old enough', () => {
        assert.equal(items.old.isOldEnough, true)
        assert.equal(items.old.toBeRemoved, true)
        assert.equal(items.recent.isOldEnough, false)
        assert.equal(items.recent.toBeRemoved, false)
    })

    it('should not remove items in excluded collections', () => {
        assert.equal(items.excluded.isntInExcludedCollection, false)
        assert.equal(items.excluded.toBeRemoved, false)
    })

    it('should not remove items with rating = "high"', () => {
        assert.equal(items.highRated.isntHighRated, false)
        assert.equal(items.highRated.toBeRemoved, false)
    })

    it('should not remove items that have won awards', () => {
        assert.equal(items.award.hasNoAwards, false)
        assert.equal(items.award.toBeRemoved, false)
    })

    it('should be able to handle items with & without titles', () => {
        assert.equal(items.untitled.title, '')
        assert.ok(items.old.title)
    })

    it('should make a list of reasons why item is to be retained', () => {
        assert.deepEqual(items.recent.reasonsRetained, ['isOldEnough'])
        // test an item that's retained for multiple reasons
        assert.ok(items.recentAndExcluded.reasonsRetained.includes('isOldEnough'))
        assert.ok(items.recentAndExcluded.reasonsRetained.includes('isntInExcludedCollection'))
    })

    it('should serialize to a CSV string', () => {
        const csv = items.commaInTitle.toCSV()
        assert.ok(csv)
        assert.ok(Item.CSVHeaderRow)
        // quotes a field that has commas in it
        assert.ok(csv.match(`"${items.commaInTitle.title}"`))
        // ends in a newline
        assert.equal(csv.match(/\n$/)[0], '\n')
    })

    it('should serialize to JSON', () => {
        assert.ok(JSON.stringify(items.commaInTitle.toJSON()))
        assert.ok(JSON.stringify(items.recentAndExcluded.toJSON()))
    })
})

// @TODO this still doesn't work, need to fix the async test
describe('Contact owner', () => {
    it('group multiple items by the same owner', () => {
        // award owned by ephetteplace, other 2 owned by same UUID user
        const list = [items.award.toJSON(), items.recent.toJSON(), items.recentAndExcluded.toJSON()]
        const itemsGroupedByOwner = contact.groupByOwner(list)
        assert.ok(itemsGroupedByOwner)
        assert.equal(itemsGroupedByOwner[items.award.owner.id].length, 1)
        assert.equal(itemsGroupedByOwner[items.award.owner.id][0].uuid, items.award.toJSON().uuid)
        assert.equal(itemsGroupedByOwner[items.recent.owner.id].length, 2)
    })

    it('sends an email to the owner', async () => {
        let result = await contact.mailUser(items.award.owner.id, [items.award.toJSON()])
        // nodemailer result looks like
        // {
        //     accepted: [ 'ephetteplace@cca.edu' ],
        //     rejected: [],
        //     envelopeTime: 231,
        //     messageTime: 739,
        //     messageSize: 512,
        //     response: '250 2.0.0 OK  1642091984 z24sm9037572pjq.17 - gsmtp',
        //     envelope: { from: 'vault@cca.edu', to: [ 'ephetteplace@cca.edu' ] },
        //     messageId: '<6b43ec3b-6a16-16db-6ccb-1f5324984827@cca.edu>'
        // }
        assert.equal(items.award.owner.id + "@cca.edu", result.accepted[0])
        // response codes that start with a "2" generally indicate success
        // https://en.wikipedia.org/wiki/List_of_SMTP_server_return_codes
        assert.equal('2', result.response.substring(0, 1))
    })
})

// lock a test item, then test unlocking and deleting it
describe('Delete item', () => {
    let headers = {
        'Accept': 'application/json',
        'X-Authorization': 'access_token=' + options.token
    }
    // note that the del methods expect an item hash, not a URL
    let testItem = { uuid: options.test_item_uuid, version: 1 }

    it('unlocks the item if it is locked', done => {
        // first we lock a test item (defined in .testretentionrc)
        fetch(
            `${options.url}/api/item/${options.test_item_uuid}/1/lock`,
            { headers: headers, method: 'POST' }
        ).then(res => {
            del.unlockItem(testItem)
                .then(res => {
                    assert.ok(res.ok)
                    done()
                }).catch(err => {
                    console.error(err)
                    done()
                    assert.fail("Failed to unlock the test item.")
                })
        }).catch(done)
    })

    it('deletes the unlocked item', () => {
        return del.deleteItem(testItem)
            .then(res => {
                assert.ok(res.ok)
                // restore the item so we can continue using it in tests
                // https://vault.cca.edu/apidocs.do#operations-Item_actions-restore
                fetch(
                    `${options.url}/api/item/${options.test_item_uuid}/1/action/restore`,
                    { headers: headers, method: 'POST' }
                ).then(res => {
                    if (!res.ok) throw new Error(`HTTP status of the reponse: ${res.status} ${res.statusText}.`)
                }).catch(err => {
                    console.error("Error restoring the deleted test item.", err)
                })
            }).catch(err => {
                console.error(err)
                assert.fail("Failed to delete the test item.")
            })
    })
})
