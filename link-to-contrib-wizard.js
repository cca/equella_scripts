/* global prompt */
/*
 * Bookmarklet to take a collection ID and output to URL for
 * its contribution wizard. Run `make contrib-wiz` to create
 * it & copy to your clipboard.
 */
var uuid = prompt('Enter collection ID (/item/@itemdefid in the XML):')
    , stem = 'https://vault.cca.edu/access/runwizard.do?method=newitem&itemdefUuid=';
void prompt('Use ⌘+C & then Return to copy URL to clipboard.', stem + uuid);
