/*global xml,data,item */
/*
take course info, split faculty string into individual names
save username of each faculty member in notifications field
which is then used in workflow
*/
function get (path) {
    return String(xml.get(path))
}
function log () {
    // turns function arguments into an array
    var msg = Array.prototype.slice.call(arguments, 0)
    logger.log('ASC ERROR: ' + msg.join(' '))
}

// must run *after* course info splitting script so courseInfo/faculty is present
var faculty = get('local/courseInfo/faculty')
if (faculty) {
    var nxp = 'local/notify'
    var list = faculty.split(', ')
    // ARCHT faculty taxonomy
    var taxo = data.getTaxonomyByUuid('982ff1eb-0ae1-4890-a346-ed4810288801')
    var term = taxo.getTerm(faculty)
    var usernames = term.getData('facultyID')

    // clear list, otherwise dupes may get added
    // we do this up here because
    xml.deleteAll(nxp)

    if (usernames) {
        var list = usernames.split(', ')
        for (var index in list) {
            xml.add(nxp, list[index])
        }
    } else {
        log('unable to find facultyID data for faculty string',
            faculty, 'on item', item.getUuid() + '/' + item.getVersion() + '/')
    }
}
