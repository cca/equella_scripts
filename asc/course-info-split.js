// this scripts splits the course taxonomy into separate metadata nodes
//
// it's very common to ask users to select their section from a COURSE LIST
// taxonomy structured like so: SEMESTER\COURSE\FACULTY\SECTION
// this parses that tree out & inserts into pertinent local/courseInfo nodes
var subjectsplit = xml.get('local/courseInfo/courseinfo').split("\\\\");

// guard against courseinfo being empty
// "".split => [""] so we can't test if [].length == 0
if (subjectsplit[0] != "") {
    xml.set('local/courseInfo/semester', subjectsplit [0]);
    xml.set('local/courseInfo/course', subjectsplit [1]);
    xml.set('local/courseInfo/faculty', subjectsplit [2]);
    xml.set('local/courseInfo/section', subjectsplit [3]);
}
