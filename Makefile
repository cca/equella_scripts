# make bookmarklet & copy to clipboard
UGFLAGS = -c -m --screw-ie8

login-link:
	uglifyjs $(UGFLAGS) login-linkify.js -o login-linkify.min.js; /bin/echo -n javascript: | cat - login-linkify.min.js | sed -e 's| |%20|g' | pbcopy

contrib-wiz:
	uglifyjs $(UGFLAGS) link-to-contrib-wizard.js -o link-to-contrib-wizard.min.js; /bin/echo -n javascript: | cat - link-to-contrib-wizard.min.js | sed -e 's| |%20|g' | pbcopy
