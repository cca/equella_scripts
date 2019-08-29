var names = xml.getAll('/local/subjectName/taxonomy_entry')
    , len = names.length
    , offset = xml.getAll('mods/subject').length;

for (var i = 0; i < len; i++) {
    // flash-separated taxonomy entry e.g. "local\personal\Phetteplace, Eric"
    var taxo_entry = names[i].split("\\\\")
	    , authority = taxo_entry[0]
	    , type = taxo_entry[1]
	    , name = taxo_entry[2];
    // only split out data if we have all the pieces
    if (authority && type && name) {
        // use offset to skip over the non-name subjects we already have
        xml.set('/mods/subject[' + (i + offset) + ']/subjectType', 'name')
    	xml.set ('/mods/subject[' + (i + offset) + ']/name/@authority', authority)
    	xml.set ('/mods/subject[' + (i + offset) + ']/name/@type', type)
    	xml.set ('/mods/subject[' + (i + offset) + ']/name', name)
    }
}
