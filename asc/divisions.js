// ##### github.com/cca/equella_scripts asc/divisions.js #####
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
    'BARCH': ['Architecture (BArch)', 'Architecture'],
    'CERAM': ['Ceramics (BFA)', 'Fine Arts'],
    'COMAR': ['Community Arts (BFA)', 'Fine Arts'],
    'COMIC': ['Comics (MFA)', 'Humanities & Sciences'],
    // supposedly FYCST now but dept code is still CORES :shrug:
    'CORES': ['First Year Program', 'Humanities & Sciences'],
    'CRAFT': ['Craft Program', 'Fine Arts'],
    // NOTE: several depts* had their codes change during the transition to
    // Workday student in Fall 2019. There's no guarantee that section codes
    // match department codes in general. The change is why  we have some programs
    // listed twice and we need to maintain both entries for backwards compatibility.
    // * Archt BFA, Film BFA, Critical Studies, Diversity Studies, DSMBA
    'CRTSD': ['Critical Studies Program', 'Humanities & Sciences'],
    'CRTST': ['Critical Studies Program', 'Humanities & Sciences'],
    'CURPR': ['Curatorial Practice (MA)', 'Humanities & Sciences'],
    'DESGN': ['Design (MFA)', 'Design'],
    // This one should be defunct as of 2021SU, we use DSMBA
    'DESST': ['Design Strategy (MBA)', 'Design'],
    // renamed from "Diversity Studies" 2021FA
    'DIVST': ['Critical Ethnic Studies Program', 'Humanities & Sciences'],
    'DIVRS': ['Critical Ethnic Studies Program', 'Humanities & Sciences'],
    'DSMBA': ['Design Strategy (MBA)', 'Design'],
    'ETHSM': ['Critical Ethnic Studies Program', 'Humanities & Sciences'],
    'ETHST': ['Critical Ethnic Studies Program', 'Humanities & Sciences'],
    'EXTED': ['Extension', 'Extension'],
    'FASHN': ['Fashion Design (BFA)', 'Design'],
    'FILMG': ['Film (MFA)', 'Fine Arts'],
    'FILMS': ['Film (BFA)', 'Fine Arts'],
    'FILMU': ['Film (BFA)', 'Fine Arts'],
    'FINAR': ['Fine Arts (MFA)', 'Fine Arts'],
    'FURNT': ['Furniture (BFA)', 'Design'],
    'FYCST': ['First Year Program', 'Humanities & Sciences'],
    'GAMES': ['Game Arts Program', 'Fine Arts'],
    'GLASS': ['Glass (BFA)', 'Fine Arts'],
    'GRAPH': ['Graphic Design (BFA)', 'Design'],
    // new program code 2021SP formerly VISST Visual Studies
    'HAAVC': ['History of Art and Visual Culture (BFA)', 'Humanities & Sciences'],
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
    // renamed from "Visual Studies" 2020FA, program code => HAAVC 2021SP
    'VISST': ['History of Art and Visual Culture (BFA)', 'Humanities & Sciences'],
    'WRITE': ['Writing (MFA)', 'Humanities & Sciences'],
    'WRLIT': ['Writing & Literature (BFA)', 'Humanities & Sciences']
}
var dept = get('local/courseInfo/department')
// we have a department & it's in the map
if (dept !== '' && map[dept]) {
    xml.set('local/department', map[dept][0])
    xml.set('local/division', map[dept][1] + ' Division')
}

// ##### END asc/divisions.js script #####
