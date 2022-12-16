/* globals describe,it,before,after */
import assert from 'node:assert'
import fs from 'node:fs'
import https from 'node:https'

import fetch from 'node-fetch'
import rc from 'rc'

import Item from '../item.js'
import { groupByOwner, mailUser } from '../contact.js'
import chunk from '../chunk.js'
import { deleteItem, unlockItem } from '../del.js'
import { embedUser, getCollections } from '../embeddata.js'

// @TODO is this needed anymore?
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

// NOTE: requires a separate config file for tests that's
// _in the root_ of this project (since `npm test` runs from root)
// see example.testretentionrc & fill in token & SMTP credentials
const options = rc('test')
const fixtpath = 'retention/test/fixtures'
const items = {
    // owned by ephetteplace
    award: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/award.json`)), options),
    // owned by internal user
    commaInTitle: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/comma-in-title.json`)), options),
    excluded: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/excluded-collection.json`)), options),
    highRated: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/high-rating.json`)), options),
    old: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/old-item.json`)), options),
    ppd: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/ppd.json`)), options),
    recent: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/recent-item.json`)), options),
    recentAndExcluded: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/recent-and-excluded.json`)), options),
    untitled: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/untitled.json`)), options),
    VCSThesis: new Item(JSON.parse(fs.readFileSync(`${fixtpath}/vcs-thesis.json`)), options),
}

describe('Identify items', () => {
    it('should identify items owned by internal users', () => {
        assert.equal(items.award.internalOwner, false)
        assert.equal(items.commaInTitle.internalOwner, true)
    })

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

    it('should not remove program portfolio documents (PPD)', () => {
        assert.equal(items.ppd.isntPPD, false)
        assert.equal(items.ppd.toBeRemoved, false)
    })

    it('should not remove items that have won awards', () => {
        assert.equal(items.award.hasNoAwards, false)
        assert.equal(items.award.toBeRemoved, false)
    })

    it('should not remove Visual Critical Studies theses', () => {
        assert.equal(items.VCSThesis.isntVCSThesis, false)
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

describe('Chunk items', () => {
    it('should chunk items into sets of specific lengths', () => {
        let gi = {
            "one": [1, 2, 3],
            "two": [4, 5],
            "thr": [6],
            "fou": [7, 8],
            "fiv": [9, 10, 11],
            "six": [12, 13, 14],
            "sev": [15]
        }
        assert.deepEqual(
            chunk(gi, 2),
            [
                [ gi["one"], gi["two"] ],
                [ gi["thr"], gi["fou"] ],
                [ gi["fiv"], gi["six"] ],
                [ gi["sev"] ]
            ]
        )
        assert.deepEqual(
            chunk(gi, 3),
            [
                [ gi["one"], gi["two"], gi["thr"] ],
                [ gi["fou"], gi["fiv"], gi["six"] ],
                [ gi["sev"] ]
            ]
        )
    })
})

describe('Contact owner', () => {
    it('group multiple items by the same owner', () => {
        // award owned by ephetteplace, other 2 owned by same UUID user
        const list = [items.award.toJSON(), items.recent.toJSON(), items.recentAndExcluded.toJSON()]
        const itemsGroupedByOwner = groupByOwner(list)
        assert.ok(itemsGroupedByOwner)
        assert.equal(itemsGroupedByOwner[items.award.owner.id].length, 1)
        assert.equal(itemsGroupedByOwner[items.award.owner.id][0].uuid, items.award.toJSON().uuid)
        assert.equal(itemsGroupedByOwner[items.recent.owner.id].length, 2)
    })

    it('sends an email to the owner', async function () {
        // email is _very_ slow so we use https://mochajs.org/#timeouts
        this.timeout(10000)
        let result = await mailUser(items.award.owner.id, [items.award.toJSON()])
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

describe('Delete item', () => {
    let headers = {
        'Accept': 'application/json',
        'X-Authorization': 'access_token=' + options.token
    }
    let httpOpts = { headers: headers, method: 'POST', agent: httpsAgent }
    // note that the del methods expect an item hash, not a URL
    let testItem = { uuid: options.test_item_uuid, version: 1 }

    before(async () => {
        // first we lock a test item (defined in .testretentionrc)
        await fetch(
            `${options.url}/api/item/${options.test_item_uuid}/1/lock`,
            httpOpts
        ).then(res => {
            if (!res.ok) throw new Error(`HTTP status of the reponse: ${res.status} ${res.statusText}.`)
        }).catch(err => {
            console.error("Error locking the test item.", err)
        })
    })

    it('unlocks the item if it is locked', () => {
        return unlockItem(testItem)
            .then(res => {
                assert.ok(res.ok)
            }).catch(err => {
                console.error(err)
                assert.fail("Failed to unlock the test item.")
            })
    })

    it('deletes the unlocked item', () => {
        return deleteItem(testItem)
            .then(res => {
                assert.ok(res.ok)
            }).catch(err => {
                console.error(err)
                assert.fail("Failed to delete the test item.")
            })
    })

    after(async () => {
        // restore the item so we can continue using it in tests
        // https://vault.cca.edu/apidocs.do#operations-Item_actions-restore
        await fetch(
            `${options.url}/api/item/${options.test_item_uuid}/1/action/restore`,
            httpOpts
        ).then(res => {
            if (!res.ok) throw new Error(`HTTP status of the reponse: ${res.status} ${res.statusText}.`)
        }).catch(err => {
            console.error("Error restoring the deleted test item.", err)
        })
    })
})

describe('Embed extra info in the item', () => {
    it('retrieves collections data', async () => {
        let collections = await getCollections()
        assert.ok(collections.length > 0)
        assert.ok(collections[0].name)
        assert.ok(collections[0].uuid)
    })

    it('embeds user info into the item data', () => {
        let user = {
            "id": "12341234",
            "firstName": "given",
            "lastName": "sur"
        }
        let item = embedUser(user, items.highRated)
        assert.equal(item.owner.firstName, user.firstName)
        assert.equal(item.owner.fullName, `${user.firstName} ${user.lastName}`)
    })
})
