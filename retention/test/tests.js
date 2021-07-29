/* globals describe,it */
const assert = require('assert')

const defaults = {
    date: '2015-07-01',
    exclude_collections: ["9ec74523-e018-4e01-ab4e-be4dd06cdd68"]
}
const options = require('rc')('retention', defaults)
const Item = require('../item.js')
const items = {
    old: require('./fixtures/old-item.json'),
    recent: require('./fixtures/recent-item.json'),
    excluded: require('./fixtures/excluded-collection.json'),
    // highRatedItem: require('./fixtures/high-rated-item.json'),
    // awardedItem: require('./fixtures/awarded-item.json'),
}

describe('Item', () => {
    it('should mark for removal items that are old enough', () => {
        const old = new Item(items.old, options)
        const recent = new Item(items.recent, options)
        assert.equal(old.isOldEnough, true)
        assert.equal(old.toBeRemoved, true)
        assert.equal(recent.isOldEnough, false)
        assert.equal(recent.toBeRemoved, false)
    })

    it('should not remove items in excluded collections', () => {
        const excluded = new Item(items.excluded, options)
        assert.equal(excluded.isntInExcludedCollection, false)
        assert.equal(excluded.toBeRemoved, false)
    })
})

// @TODO parse item with no title, title, the 2 other fixtures, CSV serializer,
// reasonse retained list
