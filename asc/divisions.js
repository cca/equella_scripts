// set title & calculate academic division based on department
// used in the Expert Scripting > Save Script of the Syllabus Collection
function get (path) {
	return String(xml.get(path))
}

// set title
var semester = get('local/courseInfo/semester')
var courseNumber = get('/local/courseInfo/courseName')
var courseTitle = get('local/courseInfo/course')

var fullTitle = semester + " | " + courseNumber + " | " + courseTitle

xml.set('/mods/titleInfo/title', fullTitle)

// program code map, the structure is
// program five-letter code: [ human-readable name, division ]
var map = {
    'ANIMA': ['Animation', 'Fine Arts'],
    'ARCHT': ['Architecture', 'Architecture'],
    'CERAM': ['Ceramics', 'Fine Arts'],
    'CIMBA': ['Civic Innovation MBA', 'Design'],
    'COMAR': ['Community Arts', 'Fine Arts'],
    'COMIC': ['Comics MFA', 'Humanities & Sciences'],
    'CORES': ['Core Studio/First Year Program', 'Humanities & Sciences'],
    'CRTST': ['Critical Studies', 'Humanities & Sciences'],
    'CURPR': ['Curatorial Practice MFA', 'Fine Arts'],
    'DESGN': ['Design MFA', 'Design'],
    'DESST': ['Design Strategy MBA', 'Design'],
    'DIVRS': ['Diversity Studies', 'Humanities & Sciences'],
    'FASHN': ['Fashion', 'Design'],
    'FILMG': ['Film MFA', 'Fine Arts'],
    'FILMS': ['Film', 'Fine Arts'],
    'FINAR': ['Fine Arts MFA', 'Fine Arts'],
    'FURNT': ['Furniture', 'Design'],
    'GLASS': ['Glass', 'Fine Arts'],
    'GRAPH': ['Graphic Design', 'Design'],
    'ILLUS': ['Illustration', 'Design'],
    'INDIV': ['Individualized', 'Fine Arts'],
    'INDUS': ['Industrial Design', 'Design'],
    'INTER': ['Interior Design', 'Architecture'],
    'IXDGR': ['Interaction Design MDes', 'Design'],
    'IXDSN': ['Interaction Design', 'Design'],
    'MARCH': ['Architecture MA', 'Architecture'],
    'METAL': ['Jewelry / Metal Arts', 'Fine Arts'],
    'PHOTO': ['Photography', 'Fine Arts'],
    'PNTDR': ['Painting/Drawing', 'Fine Arts'],
    'PRINT': ['Printmaking', 'Fine Arts'],
    'SCULP': ['Sculpture', 'Fine Arts'],
    'SFMBA': ['Strategic Foresight MBA', 'Design'],
    'TEXTL': ['Textiles', 'Fine Arts'],
    'UDIST': ['Upper Division Interdisciplinary Studies', ''],
    'VISCR': ['Visual Critical Studies MA', 'Humanities & Sciences'],
    'VISST': ['Visual Studies', 'Humanities & Sciences'],
    'WRITE': ['Writing MFA', 'Humanities & Sciences'],
    'WRLIT': ['Writing & Literature', 'Humanities & Sciences']
}
var dept = get('local/courseInfo/department')
// we have a department & it's in the map
if (dept !== '' && map[dept]) {
    xml.set('local/department', map[dept][0])
    xml.set('local/division', map[dept][1] + ' Division')
}
