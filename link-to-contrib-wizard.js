/* global prompt */
/*
 * Bookmarklet to take a collection ID from the XML of one of its items and
 * output the URL for its contribution wizard. Run `make contrib-wiz` to create
 * it & copy to your clipboard.
 */
var uuid = document.getElementsByTagName('item')[0].getAttribute('itemdefid')
    , stem = 'https://vault.cca.edu/access/runwizard.do?method=newitem&itemdefUuid=';
void prompt('Use ⌘+C & then Return to copy URL to clipboard.', stem + uuid);
