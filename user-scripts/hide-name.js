// used during assessment reviews:
// we store the item's title, which often contains PII or other giveaways,
// in a temporary metadata field, then set it to the first eight chars of its
// UUID (or any other suitable, anonymized string).
//
// run in Manage Resources > select items > Execute Script

var titleXPath = 'mods/titleInfo/title',
    title = xml.get(titleXPath),
    id = xml.get('mods/recordInfo/recordIdentifier'),
    // newTitle is 1st 8 digits of ID
    newTitle = id.split('-')[0]

// store title elsewhere, then change it. All we need to do to undo is:
// var tmp = xml.get('tmp')
// xml.set('mods/titleInfo/title', tmp)
xml.set('tmp', title)
xml.set(titleXPath, newTitle)
// store what we used as the unique ID for later use
xml.set('mods/identifier', newTitle)

// mark that this item was used in an assessment activity
var xp = 'local/assessmentWrapper/'
xml.set(xp + 'date', 'Spring 2015')
xml.set(xp + 'useInReview', 'yes')
xml.set(xp + 'type', 'Course Assessment')
xml.set(xp + 'program', 'Writing & Literature')
