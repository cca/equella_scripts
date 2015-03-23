// parse useful extra information out of ARCH Division course names
// some prefixes such as BT indicate particular special programs
// while some course titles are clues that it's a studio course
// Unfortunately, our best bet is relying on this course information
// since students themselves are apparently unaware if they're in a
// studio course or not.

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
	xml.set('local/courseInfo/semester', subjectsplit[0])
	// special step for ARCHT division which has an extra layer
	// in its Course List hierarchy
	xml.set('local/courseInfo/department', subjectsplit[1])
	xml.set('local/courseInfo/course', subjectsplit[2])
	xml.set('local/courseInfo/faculty', subjectsplit[3])
	xml.set('local/courseInfo/section', subjectsplit[4])

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
			xml.set('local/courseInfo/courseCategory', 'studio')
			break
		}
	}

	// cover all "Building Technology" programs
	// script used to just cover one
	if (course.indexOf('BT:') === 0) {
		xml.set('local/courseInfo/specialPrograms', 'Building Technology')
	}

	// note: what about DM: and UR: prefixes? What do they indicate?
	// Manage Resources search to pull up DM courses:
	// https://vault.cca.edu/access/itemadmin.do?c=WHERE+%2Fxml%2Flocal%2FcourseInfo%2Fcourse+LIKE+%27DM%3A*%27&in=1ca1ba6f-e327-4557-9b7e-25e1bba1b359&q=&sort=rank&dr=AFTER&status=&sdr=AFTER

	// parse out zipped attachments into repeaters for tagging of individual files
	var iter = xml.list('/local/staging/file').listIterator()
	while (iter.hasNext()) {
	    var index = iter.nextIndex()
	    xml.set('/mods/part[' + index + ']/number', iter.next())
	}
}

// parse out Junior Review attachments into repeaters so they can be individually tagged
if (xml.contains('/local/courseWorkWrapper/courseWorkType', 'Junior review')) {
	var iter = xml.list('/local/juniorReviewWrapper/stagingWrapper/file').listIterator()
	while (iter.hasNext()) {
		var index = iter.nextIndex()
		xml.set('/local/juniorReviewWrapper/fileWrapper[' + index + ']/file', iter.next())
	}
}
