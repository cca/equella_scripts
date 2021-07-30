/*
 * Bookmarklet to take a collection ID from the XML of one of its items and
 * output the URL for its contribution wizard. Run `npm run contrib-wiz` to
 * crreate it & copy to your clipboard.
 */
var uuid = ''
    , stem = 'https://vault.cca.edu/access/runwizard.do?method=newitem&itemdefUuid=';
try {
    // for <XML> pages
    uuid = document.getElementsByTagName('item')[0]
        .getAttribute('itemdefid');
} catch(e) {
    // get collection ID from first breadcrumb's href
    // it's in the query string, like "…?in=C${uuid}&…"
    uuid = document.getElementById('breadcrumb-inner')
        .getElementsByTagName('a')[0]
        .getAttribute('href')
        .match(/\?in=C(.*?)&/)[1];
}
void prompt('Use ⌘+C & then Return to copy URL to clipboard.', stem + uuid);
