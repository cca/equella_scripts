// used in Syllabus Collection ASC > "courseinfo splitting script"
function get (path) {
    return String(xml.get(path))
}

// grab XList data and set to xml
var tax = data.getTaxonomyByUuid('446bfb49-270d-405d-9cfe-148c23c1c744')
var selection = get('local/courseInfo/courseinfo')
if (selection !== '') {
    var courseTerm = tax.getTerm(selection)
    if (courseTerm !== null) {
        var xlistKey = courseTerm.getData('XList')
        if (xlistKey !== null) {
            xml.set('local/courseInfo/XList', xlistKey)
        }
        var CrsNameKey = courseTerm.getData('CrsName')
        if (CrsNameKey !== null) {
            xml.set('local/courseInfo/courseName', CrsNameKey)
        }
        var facultyIDKey = courseTerm.getData('facultyID')
        if (facultyIDKey !== null) {
            xml.set('local/courseInfo/facultyID', facultyIDKey)
        }
    }
}

// parsing course info into separate xml nodes
var subjectsplit = get('local/courseInfo/courseinfo').split("\\")

if (subjectsplit.length > 0) {
    xml.set('local/courseInfo/semester', subjectsplit[0])
    xml.set('local/courseInfo/department', subjectsplit[1])
    xml.set('local/courseInfo/course', subjectsplit[2])
    xml.set('local/courseInfo/faculty', subjectsplit[3])
    xml.set('local/courseInfo/section', subjectsplit[4])
}

var course = get('local/courseInfo/course')
// Media History
if (course.indexOf('MH') === 0 || course.indexOf('Media History') === 0) {
    xml.set('local/courseInfo/courseCategory', 'Media History')
}
// ENGAGE and EcoTAP
if (course.indexOf('Eco') === 0) {
    xml.set('local/courseInfo/specialPrograms', 'EcoTAP')
}
if (course.toLowerCase().indexOf('engage:') === 0 || course.indexOf('SRL/ENGAGE:') === 0) {
    xml.set('local/courseInfo/courseCategory', 'ENGAGE')
}
if (course.indexOf('IS:') === 0) {
    xml.set('local/courseInfo/courseCategory', 'Investigative Studio')
}
if (course.indexOf('Engage/Eco:') === 0 || course.indexOf('Engage:Eco:') === 0) {
    xml.set('local/courseInfo/courseCategory', 'ENGAGE')
    xml.set('/local/courseInfo/specialPrograms', 'EcoTAP')
}
// First Year Program dimensions
// NOTE: must leave colon on the end otherwise titles like "3D Animation"
// get misclassified
if (course.indexOf('D1:') === 0) {
    xml.set('local/courseInfo/courseCategory', 'FYP: D1')
}
if (course.indexOf('2D:') === 0) {
    xml.set('local/courseInfo/courseCategory', 'FYP: 2D')
}
if (course.indexOf('3D:') === 0) {
    xml.set('local/courseInfo/courseCategory', 'FYP: 3D')
}
if (course.indexOf('4D:') === 0) {
    xml.set('local/courseInfo/courseCategory', 'FYP: 4D')
}

var dept = get('local/courseInfo/department')
if (dept.indexOf('CRITI') === 0) {
    xml.set('local/courseInfo/courseCategory', 'Interdisciplinary Critique')
}
if (dept.indexOf('CRTST') === 0) {
    xml.set('local/courseInfo/courseCategory', 'Critical Studies')
}
if (dept.indexOf('CRAFT') === 0) {
    xml.set('local/courseInfo/courseCategory', 'Craft')
}
if (dept.indexOf('ARTED') === 0 || dept.indexOf('INTDS') === 0) {
    xml.set('local/courseInfo/courseCategory', 'Interdisciplinary Studio')
}
