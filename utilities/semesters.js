/*jshint -W083 */
// usage:
// node semesters > taxo.csv
// (creates semester taxonomy from 2003 Spring to 2017 Fall)
// OR
// > node semesters 2010 2003 > taxo.csv
// (creates semester taxonomy from 2010 Spring to 2003 Fall)
// can then upload with
// > uptaxo --un $USERNAME --pw $PASSWORD --clear --csv taxo.csv --tid $TID
// and our TID for Semesters taxo is 48af53bc-838a-4e5b-985c-8dbf5cbe2e45

/*jshint node:true */
var start = process.argv[2] || 2003
var end = process.argv[3] || 2017
var seasons = ['Fall', 'Summer', 'Spring']

for (var i = end; i > start - 1; i--) {
    seasons.forEach(function(season) {
        console.log(['"', season, ' ', i, '"'].join(''));
    })
}
