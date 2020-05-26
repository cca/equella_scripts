/*jshint -W083 */
// usage:
// > node semesters STARTYEAR ENDYEAR > taxo.csv
// creates semester taxonomy from Spring of start year to Fall of end year
//
// can then upload to VAULT with
// > uptaxo --un $USERNAME --pw $PASSWORD --clear --csv taxo.csv --tid $TID
// and our TID for Semesters taxo is 48af53bc-838a-4e5b-985c-8dbf5cbe2e45
//
// this is the complete process:
// node utilities/semesters.js 2003 2030 && uptaxo --un=(jq -r .username ~/.equellarc) --pw=(jq -r .password ~/.equellarc) --clear --csv taxo.csv --tid 48af53bc-838a-4e5b-985c-8dbf5cbe2e45

/*jshint node:true, esversion:6 */
const start = process.argv[2] || 2003
const end = process.argv[3] || 2017
const seasons = ['Fall', 'Summer', 'Spring']

for (let i = end; i > start - 1; i--) {
    seasons.forEach((season) => {
        console.log(['"', season, ' ', i, '"'].join(''));
    })
}
