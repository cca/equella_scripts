/*
 * Bookmarklet to copy current VAULT page URL as link sent through
 * login redirect. Run `npm run login-link` to create it & copy to
 * your clipboard.
 */
var pg = location.pathname + location.search
    , stem = 'https://vault.cca.edu/logon.do?page=';

void prompt('Use ⌘+C & then Return to copy URL to clipboard.', stem + encodeURIComponent(pg));
