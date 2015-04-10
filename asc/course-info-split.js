// this scripts splits the course taxonomy into separate metadata nodes
//
// it's very common to ask users to select their section from a COURSE LIST
// taxonomy structured like so: SEMESTER\COURSE\FACULTY\SECTION
// this parses that tree out & inserts into pertinent local/courseInfo nodes
var cxp = 'local/courseInfo/'
var courseInfo = xml.get(cxp + 'courseinfo')
var subjectSplit = courseInfo.split("\\\\")
// change this to the department-specific COURSE LIST taxonomy UUID
var courseListUuid = ''
var set = function (path, str) {
    if (str) {
		xml.set(path, str)
	}
}

// guard against empty courseinfo
// "".split => [""] so we can't test if [].length == 0
if (subjectSplit[0] !== "") {
    set(cxp + 'semester', subjectSplit[0])
    set(cxp + 'course', subjectSplit[1])
    set(cxp + 'faculty', subjectSplit[2])
    set(cxp + 'section', subjectSplit[3])

    // guard against us forgetting to input the UUID
    // you can find courseListUuid using equella-cli:
    // > eq tax --name 'DEPT - COURSE LIST' | grep uuid
    if (courseListUuid) {
        var tax = data.getTaxonomyByUuid(courseListUuid)
        var courseTerm = tax.getTerm(courseInfo)
        if (courseTerm !== null) {
            set(cxp +  'XList', courseTerm.getData('XList'))
    		set(cxp +  'courseName', courseTerm.getData('CrsName'))
    		set(cxp +  'facultyID', courseTerm.getData('facultyID'))
        }
    }
}
