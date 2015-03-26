// parse useful extra information out of ARCH Division course names
// some prefixes such as BT indicate particular special programs
// while some course titles are clues that it's a studio course
// Unfortunately, our best bet is relying on this course information
// since students themselves are apparently unaware if they're in a
// studio course or not.

// abstraction over xml.set to help make a few passages more concise
function set (path, str) {
	if (str) {
		xml.set(path, str)
	}
}

if (xml.contains('/local/courseWorkWrapper/submissionType', 'Course work')) {
	//script to grab XList data and set to xml
	var tax = data.getTaxonomyByUuid('1ccf4d37-e086-4ba3-b8d6-cf2647491aa4')
	var selection = xml.get('local/courseInfo/courseinfo')
	if (selection.length() > 0) {
		var courseTerm = tax.getTerm(selection)
		set('local/courseInfo/XList', courseTerm.getData('XList'))
		set('local/courseInfo/courseName', courseTerm.getData('CrsName'))
		set('local/courseInfo/facultyID', courseTerm.getData('facultyID'))
	}

	//script to split course taxonomy into separate metadata nodes
	var subjectsplit = xml.get('local/courseInfo/courseinfo').split("\\\\")
	set('local/courseInfo/semester', subjectsplit[0])
	// special step for ARCHT division which has an extra layer
	// in its Course List hierarchy
	set('local/courseInfo/department', subjectsplit[1])
	set('local/courseInfo/course', subjectsplit[2])
	set('local/courseInfo/faculty', subjectsplit[3])
	set('local/courseInfo/section', subjectsplit[4])

	// separate out studio courses from non-studio courses
	// powers subsequent contribution pages
	var course = xml.get('local/courseInfo/course')
	// list of studio courses
	var studioCourses = [
		' Studio', // catch all—courses with "studio" in them are a pretty good bet
		'Form + Space',
		'Architecture Studio',
		'Advanced Studio',
		'Adv Interdisciplinary Studio',
		"M'Arch Studio",
		'Architect Summer Studio'
	]

	// is it in the list of studio courses? set courseCategory then
	for (var i = 0; i < studioCourses.length; i++) {
		if (course.indexOf(studioCourses[i]) !== -1) {
			set('local/courseInfo/courseCategory', 'studio')
			break
		}
	}

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
