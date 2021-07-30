/* globals describe,it */
const assert = require('assert')

const defaults = {
    date: '2015-07-01',
    exclude_collections: ["9ec74523-e018-4e01-ab4e-be4dd06cdd68"]
}
const options = require('rc')('retention', defaults)
const Item = require('../item.js')
const items = {
    award: require('./fixtures/award.json'),
    excluded: require('./fixtures/excluded-collection.json'),
    highRated: require('./fixtures/high-rating.json'),
    old: require('./fixtures/old-item.json'),
    recent: require('./fixtures/recent-item.json'),
    untitled: require('./fixtures/untitled.json'),
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

    it('should not remove items with rating = "high"', () => {
        const highRated = new Item(items.highRated, options)
        assert.equal(highRated.toBeRemoved, false)
    })

    it('should not remove items that have won awards', () => {
        const award = new Item(items.award, options)
        assert.equal(award.toBeRemoved, false)
    })

    it('should be able to handle items with & without titles', () => {
        const untitled = new Item(items.untitled, options)
        const old = new Item(items.old, options)
        assert.equal(untitled.title, '')
        assert.ok(old.title)
    })
})

// @TODO CSV serializer, reasons retained list
