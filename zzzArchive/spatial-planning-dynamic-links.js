// usage: node spatialPlanningDynamicLinks.js
// (prints out the output)
//
// to pipe straight into OS X clipboard:
// node spatialPlanningDynamicLinks.js | pbcopy
//
// script to programmatically generate the dynamic (Power Search) URLs
// for all broad-sub category pairs of the Campus Planning (Spatial Benchmarking)
// collection: https://vault.cca.edu/access/searching.do?in=Cf75326ab-977c-4873-8987-eaa419ecb773
// these URLs will be used on the portlet on the home page
var pieces = [ '/access/searching.do?doc=%3Cxml%3E%3Cmods%3E%3CgenreWrapper%3E%3Cgenre%3E',
    null,
    '%3C%2Fgenre%3E%3C%2FgenreWrapper%3E%3Cpart%3E%3CwrapperOther%3E%3Ctags%3E',
    null,
    '%3C%2Ftags%3E%3C%2FwrapperOther%3E%3C%2Fpart%3E%3C%2Fmods%3E%3C%2Fxml%3E&in=P63e19032-7c08-44ec-b3d4-24904a2c4ccd&q=&sort=datemodified&dr=AFTER' ],
    cats = {
        'Spatial (Typologies)': [ 'Making', 'Teaching & Learning', 'Research & Resources', 'Living'],
        '(Spatial) Qualities': [ 'Enclosure', 'Adjacency', 'Display', 'Materials'],
        'Activities': [ 'Assembling', 'Circulation', 'Retreating', 'Breaking Bread' ],
    },
    broadCats = Object.keys(cats);

broadCats.forEach(function (broadCat) {
    cats[broadCat].forEach(function (subCat) {
        var url = pieces;

        // because the "doc" param is decoded & then parsed as XML,
        // we need to escape &s first, before they're URI-encoded
        // &s are only in 2 subcats but replace both just in case
        url[1] = encodeURIComponent(broadCat.replace('&', '&amp;'));
        url[3] = encodeURIComponent(subCat.replace('&', '&amp;'));

        console.log(broadCat + ' - ' + subCat + ':');
        console.log(url.join('') + '\n');
    });
});
