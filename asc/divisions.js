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
    'ANIMA': ['Animation (BFA)', 'Fine Arts'],
    'ARCHT': ['Architecture (BArch)', 'Architecture'],
    'CERAM': ['Ceramics (BFA)', 'Fine Arts'],
    'COMAR': ['Community Arts (BFA)', 'Fine Arts'],
    'COMIC': ['Comics (MFA)', 'Humanities & Sciences'],
    'CORES': ['First Year Program', 'Humanities & Sciences'],
	'CRAFT': ['Craft Program', 'Fine Arts'],
    'CRTST': ['Critical Studies Program', 'Humanities & Sciences'],
    'CURPR': ['Curatorial Practice (MA)', 'Fine Arts'],
    'DESGN': ['Design (MFA)', 'Design'],
    'DESST': ['Design Strategy (MBA)', 'Design'],
    'DIVRS': ['Diversity Studies Program', 'Humanities & Sciences'],
    'FASHN': ['Fashion Design (BFA)', 'Design'],
    'FILMG': ['Film (MFA)', 'Fine Arts'],
    'FILMS': ['Film (BFA)', 'Fine Arts'],
    'FINAR': ['Fine Arts (MFA)', 'Fine Arts'],
    'FURNT': ['Furniture (BFA)', 'Design'],
	'FYCST': ['First Year Program', 'Humanities & Sciences'],
    'GLASS': ['Glass (BFA)', 'Fine Arts'],
    'GRAPH': ['Graphic Design (BFA)', 'Design'],
    'ILLUS': ['Illustration (BFA)', 'Design'],
    'INDIV': ['Individualized (BFA)', 'Fine Arts'],
    'INDUS': ['Industrial Design (BFA)', 'Design'],
	// department for UDIST/DIVST/DIVRS sections, exception to many rules
	'INTDS': ['Interdisciplinary Studies', 'Interdisciplinary Studies'],
    'INTER': ['Interior Design (BFA)', 'Architecture'],
    'IXDGR': ['Interaction Design (MDes)', 'Design'],
    'IXDSN': ['Interaction Design (BFA)', 'Design'],
    'MARCH': ['Architecture (MArch)', 'Architecture'],
    'METAL': ['Jewelry / Metal Arts (BFA)', 'Fine Arts'],
    'PHOTO': ['Photography (BFA)', 'Fine Arts'],
    'PNTDR': ['Painting/Drawing (BFA)', 'Fine Arts'],
    'PRINT': ['Printmedia (BFA)', 'Fine Arts'],
    'SCULP': ['Sculpture (BFA)', 'Fine Arts'],
    'SFMBA': ['Strategic Foresight (MBA)', 'Design'],
	'SOCPR': ['Social Practice & Public Forms (MA)', 'Fine Arts'],
    'TEXTL': ['Textiles (BFA)', 'Fine Arts'],
    'VISCR': ['Visual & Critical Studies (MA)', 'Humanities & Sciences'],
    'VISST': ['Visual Studies (BFA)', 'Humanities & Sciences'],
    'WRITE': ['Writing (MFA)', 'Humanities & Sciences'],
    'WRLIT': ['Writing & Literature (BFA)', 'Humanities & Sciences']
}
var dept = get('local/courseInfo/department')
// we have a department & it's in the map
if (dept !== '' && map[dept]) {
    xml.set('local/department', map[dept][0])
    xml.set('local/division', map[dept][1] + ' Division')
}
