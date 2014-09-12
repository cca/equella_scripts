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
    newTitle = id.split('-')[0];

// store title elsewhere, then change it
xml.set('tmp', title);
xml.set(titleXPath, newTitle);
