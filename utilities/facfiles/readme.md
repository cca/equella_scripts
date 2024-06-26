# Faculty Files

Download all of a particular faculty member's archived syllabi, including co-taught courses, in a given time range. These files are useful during tenure review, for instance. It saves all the syllabi into the "files" directory and names them after the form "Spring 2017 ILLUS-230-01 Tools_ Hand-Lettering.pdf" e.g. semester, followed by section code, followed by course name.

To run the script:

- ensure you have node & npm
- run `pnpm install` (preferred) or `npm install` to get dependencies
- obtain an OAuth API access token from VAULT
- create a ".facfilesrc" configuration file (see the included example), add the token to it
- run `node facfiles --name "Audre Lorde"` to download the files
- once done, you can zip up all the syllabi with `zip -r files.zip files -x files/.gitkeep`

If running multiple times, remember to clean out the files directory in between. Included is a "list-download.fish" script to iterate over a list of names in a "faculty.txt" file, creating a folder for each instructor's syllabi.

## Sections

For requests for particular section codes, use `node sections --match ARTED-1002` where the `--match` parameter is checked against the section code. The sections script also supports a `modifiedAfter` parameter to filter search results a little further. If we want all 2023-24 DSMBA syllabi, for instance, we can run `node sections --match DSMBA --modifiedAfter 2023-08-01` since all syllabi would be uploaded after that date.

To run against a list of section codes, try this (Fish shell code):

```fish
for code in (cat sections.txt)
  echo "Downloading syllabi for $code"
  node sections --match $code
end
```

## Notes

We have a [Syllabi for APT Drive folder](https://drive.google.com/drive/folders/1Cq9iEmORrsbzYRSQWIUIh1jobfGNhIVF) where we store these files. Don't share that folder itself with whomever in Academic Affairs requested syllabi, but a dated child folder (which has the same contents as the "faculty" folder here).

Any parameter defined in .facfilesrc can also be passed as a command-line parameter, e.g., `node facfiles --name 'Eric Phetteplace' --start_term 'Fall 2017'`.

Terms must be in form "Fall 2020", i.e., match this regex "(Spring|Summer|Fall) \d{4}". Either `start_term` or `stop_term` can be `0` (or another falsey value) to remove that limit. We can retrieve _all_ syllabi by setting both to `0`.

The tool uses a freetext query to find syllabi initially but then parses the VAULT XML metadata (using `/xml/local/courseInfo/faculty` specifically) to look for an exact name match in the right field. We have to do this because openEQUELLA's rudimentary `where` clause does not support a `LIKE` operator that starts with a wildcard. So it is impossible for us to match the name "Person Two" in the string "Person One, Person Two" because we cannot filter like `where /local/courseInfo/faculty LIKE '%Person Two%'`.
