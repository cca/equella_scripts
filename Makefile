# make bookmarklet & copy to clipboard
bookmarklet:
	uglifyjs -c -m --screw-ie8 login-linkify.js -o login-linkify.min.js; /bin/echo -n javascript: | cat - login-linkify.min.js | sed -e 's| |%20|g' | pbcopy
