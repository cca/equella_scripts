/*
 * Bookmarklet to copy current VAULT page URL as link sent through
 * login redirect. Run `make bookmarklet` to create it & copy to
 * your clipboard.
 */
var pg = location.pathname
    , stem = 'https://vault.cca.edu/logon.do?page=';

prompt('Use ⌘+C & then Return to copy URL to clipboard.', stem + pg);
