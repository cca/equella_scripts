// most of the fields that we usually set here are Static Metadata under the Wizard tab
xml.set('/mods/recordInfo/recordIdentifier', item.getUuid())

// using this as a metadata model:
// www.loc.gov/standards/mods/v3/mods-userguide-examples.html#journal_article
// but its impossible to make that easy to fill out in EQUELLA
// so this script maps staging values into place & populates things
function get(path) {
    return String(xml.get(path))
}

var publication = xml.getSubtree('/mods/relatedItem/part')
var pages = get('/mods/part/numberB')
var vol = get('/mods/part/numberC')
var issue = get('/mods/part/numberD')
var standardNo = get('/mods/relatedItem/identifier')

// NOTE: naive EQUELLA XPath engine doesn't allow non-final attribute selectors
// e.g. 'detail/@type' works but not 'detail[@type="volume"]/number'
// which is the more explicit & correct way to do the 2 stanzas below

// clear existing "detail" nodes
if (publication) publication.deleteAll('detail')

if (vol && publication) {
    publication.add('detail/caption', 'vol.')
    publication.set('detail/@type', 'volume')
    publication.set('detail/number', vol)
}

if (issue && publication) {
    // work around terrible XML APIs, cannot add empty node
    publication.add('detail', '')
    // works out variable number of details, whether we added vol. before or not
    // I have _no idea_ why we need the -1 when XPath indexes from 1, but we do
    var index = publication.list('detail').size() - 1
    publication.set('detail[' + index + ']/caption', 'no.')
    publication.set('detail[' + index + ']/@type', 'number')
    publication.set('detail[' + index + ']/number', issue)
}

if (pages && publication) {
    // clear existing page range nodes
    publication.deleteAll('extent')
    var digits = pages.match(/\d+/g)

    if (digits) {
        var start = digits[0]
        var end = digits[1]
        publication.set('extent/@unit', 'page')
        publication.set('extent/start', start)
        // end could be "undefined" for a page value like "p. 23"
        publication.set('extent/end', end || '')
    }
}

if (standardNo) {
    // clear existing identifier types
    xml.deleteAll('/mods/relatedItem/identifier/@type')
    var type = get('/mods/genreWrapper/genre')

    switch (type) {
    case 'journal article':
        xml.set('/mods/relatedItem/identifier/@type', 'issn')
        break;
    case 'book chapter':
        xml.set('/mods/relatedItem/identifier/@type', 'isbn')
        break;
    default:
        // if it falls through, do nothing
        break;
    }
}

if (get('mods/identifier') != '') {
    xml.set('mods/identifier/@type', 'doi')
}
