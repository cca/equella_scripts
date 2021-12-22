# Faculty Files

The purpose of this script is to download all of a particular faculty member's archived syllabi, including co-taught courses, in a given time range. These files are useful during tenure review, for instance. It saves all the syllabi into the "files" directory and names them after the form "Spring 2017 ILLUS-230-01 Tools_ Hand-Lettering.pdf" e.g. semester, followed by section code, followed by course name.

To run the script:

- ensure you have node & npm
- run `npm install` to get dependencies
- obtain an OAuth API access token from VAULT
- create a ".facfilesrc" configuration file (see the included example), add the token to it
- run `node facfiles.js --name "Audre Lorde"` to download the files
- once done, you can zip up all the syllabi with `zip -r files.zip files -x files/.gitkeep`

If running multiple times, remember to clean out the files directory in between. There's a "list-download.fish" shell script included which iterates over a text file of faculty names, creating a zip archive for each.

## Notes

Any parameter defined in .facfilesrc can also be passed as a command-line parameter, e.g., `node facfiles.js --name 'Eric Phetteplace' --start_term 'Fall 2017'`.

Terms must be in form "Fall 2020", i.e., match this regex "(Spring|Summer|Fall) \d{4}". We can set either `start_term` or `stop_term` to be `0` (or another falsey value). We can retrieve _all_ syllabi by setting both to `0`.

The tool uses a freetext query to find syllabi initially but then parses the VAULT XML metadata (using `/xml/local/courseInfo/faculty` specifically) to look for an exact name match in the right field. We have to do this because openEQUELLA's rudimentary `where` clause does not support a `LIKE` operator that starts with a wildcard. So it is impossible for us to match the name "Person Two" in faculty metadata "Person One, Person Two" because we cannot filter like `where /local/courseInfo/faculty LIKE '%Person Two%'`.
