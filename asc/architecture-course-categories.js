// parse useful extra information out of ARCH Division course names
// some prefixes such as BT indicate particular special programs
// while some course titles are clues that it's a studio course
// Unfortunately, our best bet is relying on this course information
// since students themselves are apparently unaware if they're in a
// studio course or not.

// abstractions over XML methods to help make a few passages more concise
function set (path, str) {
    if (str) {
        xml.set(path, str)
    }
}

function get (path) {
    return String(xml.get(path))
}

if (xml.contains('/local/courseWorkWrapper/courseWorkType', 'Course work')) {
    // grab XList data and set to xml
    var tax = data.getTaxonomyByUuid('1ccf4d37-e086-4ba3-b8d6-cf2647491aa4')
    var selection = get('local/courseInfo/courseinfo')
    if (selection && tax) {
        var courseTerm = tax.getTerm(selection)
        if (courseTerm) {
            set('local/courseInfo/XList', courseTerm.getData('XList'))
            set('local/courseInfo/courseName', courseTerm.getData('CrsName'))
            // add each faculty username as its own node
            // necessary for notifications to go to out to everyone
            var ids = courseTerm.getData('facultyID').split(', ')
            xml.deleteAll('local/courseInfo/facultyID')
            for (var i =0; i < ids.length; i++) {
                xml.add('local/courseInfo/facultyID', ids[i])
            }
        }
    }

    // split course taxonomy into separate metadata nodes
    var subjectsplit = get('local/courseInfo/courseinfo').split("\\")
    set('local/courseInfo/semester', subjectsplit[0])
    // special step for ARCHT division which has an extra layer
    // in its Course List hierarchy
    set('local/courseInfo/department', subjectsplit[1])
    set('local/courseInfo/course', subjectsplit[2])
    set('local/courseInfo/faculty', subjectsplit[3])
    set('local/courseInfo/section', subjectsplit[4])

    // separate studio courses from non-studio courses
    // powers subsequent contribution pages
    var courseName = get('local/courseInfo/courseName')
    // list of studio courses, see spreadsheet provided by ARCH PM on 4/2/15:
    // https://docs.google.com/a/cca.edu/spreadsheets/d/17RKd-U3z06ykHJFcdX_zuTBW0erUDyo_EvWtB_7s2oc/edit?usp=sharing
    var studioCourses = [
        'ARCHT-100' // Form + Space is considered studio b/c of types of work produced
        // see email from arph on 4/2/15
        , 'ARCHT-201'
        , 'ARCHT-202'
        , 'ARCHT-303'
        , 'ARCHT-304'
        , 'ARCHT-507'
        , 'ARCHT-508'
        , 'ARCHT-509'
        // Fall 2019 change & for backwards compatibility we have to list both
        , 'BARCH-100'
        , 'BARCH-201'
        , 'BARCH-202'
        , 'BARCH-303'
        , 'BARCH-304'
        , 'BARCH-507'
        , 'BARCH-508'
        , 'BARCH-509'
        , 'MARCH-600' // given to us as 'MARCH-600P' but prolly safer w/o the 'P'
        , 'MARCH-601'
        , 'MARCH-602'
        , 'MARCH-603'
        , 'MARCH-609'
        , 'MARCH-607'
        , 'MARCH-608'
        , 'INTER-100' // cross-list of ARCHT-100, same note as above
        , 'INTER-200'
        , 'INTER-204'
        , 'INTER-216'
        , 'INTER-220'
        , 'INTER-300'
        , 'INTER-304'
        , 'INTER-308'
        , 'INTER-320'
        , 'INTER-404'
        , 'INTER-400'
    ]

    // is it in the list of studio courses? set courseCategory then
    for (var i = 0; i < studioCourses.length; i++) {
        // works for 3- & 4-digit (e.g. ARCHT-1000) course codes
        if (courseName.indexOf(studioCourses[i]) !== -1 ||
            courseName.substr(0, 9).indexOf(studioCourses[i]) !== -1) {
            set('local/courseInfo/courseCategory', 'studio')
            break
        }
    }

    var course = get('local/courseInfo/course')
    // record special elective programs which appear as prefixes in course names
    if (course.indexOf('BT:') === 0) {
        set('local/courseInfo/specialPrograms', 'Building Technology')
    } else if (course.indexOf('DM:') === 0) {
        set('local/courseInfo/specialPrograms', 'Design Media')
    } else if (course.indexOf('GR:') === 0) {
        set('local/courseInfo/specialPrograms', 'Grad Elective')
    } else if (course.indexOf('HT:') === 0) {
        set('local/courseInfo/specialPrograms', 'History Theory')
    } else if (course.indexOf('IN:') === 0) {
        set('local/courseInfo/specialPrograms', 'Interiors')
    } else if (course.indexOf('UR:') === 0) {
        set('local/courseInfo/specialPrograms', 'Urbanism')
    }

    // parse out zipped attachments into repeaters for tagging of individual files
    var iter = xml.list('/local/staging/file').listIterator()
    while (iter.hasNext()) {
        var index = iter.nextIndex()
        set('/mods/part[' + index + ']/number', iter.next())
    }
}

// parse out Junior Review attachments into repeaters so they can be individually tagged
if (xml.contains('/local/courseWorkWrapper/courseWorkType', 'Junior review')) {
    var iter = xml.list('/local/juniorReviewWrapper/stagingWrapper/file').listIterator()
    while (iter.hasNext()) {
        var index = iter.nextIndex()
        set('/local/juniorReviewWrapper/fileWrapper[' + index + ']/file', iter.next())
    }
}
