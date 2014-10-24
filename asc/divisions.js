var semester = xml.get('local/courseInfo/semester');
var courseNumber = xml.get('/local/courseInfo/courseName');
var courseTitle = xml.get('local/courseInfo/course');

var fullTitle = semester + " | " + courseNumber + " | " + courseTitle;

xml.set('/mods/titleInfo/title',fullTitle);

if( xml.contains('/local/courseInfo/department', 'ARCHT') ||
    xml.contains('/local/courseInfo/department', 'INTER') ||
    xml.contains('/local/courseInfo/department', 'MARCH') ||
    xml.contains('/local/courseInfo/department', 'MAUDL'))
{
    xml.set('local/division', 'Architecture Division');
}

if( xml.contains('/local/courseInfo/department', 'ANIMA') ||
    xml.contains('/local/courseInfo/department', 'CERAM') ||
    xml.contains('/local/courseInfo/department', 'COMAR') ||
    xml.contains('/local/courseInfo/department', 'CRAFT') ||
    xml.contains('/local/courseInfo/department', 'CRITI') ||
    xml.contains('/local/courseInfo/department', 'FILMS') ||
    xml.contains('/local/courseInfo/department', 'FILMG') ||
    xml.contains('/local/courseInfo/department', 'FINAR') ||
    xml.contains('/local/courseInfo/department', 'FNART') ||
    xml.contains('/local/courseInfo/department', 'GLASS') ||
    xml.contains('/local/courseInfo/department', 'INDIV') ||
    xml.contains('/local/courseInfo/department', 'METAL') ||
    xml.contains('/local/courseInfo/department', 'PHOTO') ||
    xml.contains('/local/courseInfo/department', 'PNTDR') ||
    xml.contains('/local/courseInfo/department', 'PRINT') ||
    xml.contains('/local/courseInfo/department', 'SCULP') ||
    xml.contains('/local/courseInfo/department', 'TEXTL'))
{
    xml.set('local/division', 'Fine Arts Division');
}

if( xml.contains('/local/courseInfo/department', 'DESGN') ||
    xml.contains('/local/courseInfo/department', 'DESST') ||
    xml.contains('/local/courseInfo/department', 'FASHN') ||
    xml.contains('/local/courseInfo/department', 'FURNT') ||
    xml.contains('/local/courseInfo/department', 'ILLUS') ||
    xml.contains('/local/courseInfo/department', 'INDUS') ||
    xml.contains('/local/courseInfo/department', 'IXDSN') ||
    xml.contains('/local/courseInfo/department', 'GRAPH') )
{
    xml.set('local/division', 'Design Division');
}

if( xml.contains('/local/courseInfo/department', 'CURPR') ||
    xml.contains('/local/courseInfo/department', 'COMIC') ||
    xml.contains('/local/courseInfo/department', 'CRTST') ||
    xml.contains('/local/courseInfo/department', 'VISCR') ||
    xml.contains('/local/courseInfo/department', 'VISST') ||
    xml.contains('/local/courseInfo/department', 'WRITE') ||
    xml.contains('/local/courseInfo/department', 'WRLIT') )
{
    xml.set('local/division', 'Humanities and Sciences Division');
}

if( xml.contains('/local/courseInfo/department', 'CORES'))
{
    xml.set('local/division', 'First Year Program');
}

if( xml.contains('/local/courseInfo/department', 'ARTED') ||
    xml.contains('/local/courseInfo/department', 'INTDS'))
{
    xml.set('local/division', 'College-Wide Programs Division');
}
