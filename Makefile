# make bookmarklet & copy to clipboard
all: login-link contrib-wiz

login-link:
	npx uglify-js -c -m bookmarklets/login-linkify.js -o login-linkify.min.js; /bin/echo -n javascript: | cat - login-linkify.min.js | sed -e 's| |%20|g' | pbcopy

contrib-wiz:
	npx uglify-js -c -m bookmarklets/link-to-contrib-wizard.js -o link-to-contrib-wizard.min.js; /bin/echo -n javascript: | cat - link-to-contrib-wizard.min.js | sed -e 's| |%20|g' | pbcopy
