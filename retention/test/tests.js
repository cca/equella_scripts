/* globals describe,it */
const assert = require('assert')

const defaults = {
    date: '2015-07-01',
    exclude_collections: ["9ec74523-e018-4e01-ab4e-be4dd06cdd68"]
}
const options = require('rc')('retention', defaults)
const Item = require('../item.js')
const contact = require('../contact')
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

describe('Item', () => {
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

describe('Contact', () => {
    it('group multiple items by the same owner', () => {
        // award owned by ephetteplace, other 2 owned by same UUID user
        const list = [items.award.toJSON(), items.recent.toJSON(), items.recentAndExcluded.toJSON()]
        const itemsGroupedByOwner = contact.groupByOwner(list)
        assert.ok(itemsGroupedByOwner)
        assert.equal(itemsGroupedByOwner[items.award.owner.id].length, 1)
        assert.equal(itemsGroupedByOwner[items.award.owner.id][0].uuid, items.award.toJSON().uuid)
        assert.equal(itemsGroupedByOwner[items.recent.owner.id].length, 2)
    })
})
