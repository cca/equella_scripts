// Hybrid Lab
var section = String(xml.get('local/courseInfo/section'))
var semester = xml.get('local/courseInfo/semester')
// sections held in the hybrid lab, Fall 2018
var hlsections = [
    'DESGN-609-01',
    'DESGN-670-05',
    'IXDSN-250-02',
    'IXDSN-250-02',
    'IXDSN-300-01',
    'IXDSN-300-01',
    'SCIMA-200-01',
    'SCIMA-200-11',
    'SCMIA-212-01'
]

if (semester == 'Fall 2018' && hlsections.indexOf(section) > -1) {
    xml.set('local/tags', 'Hybrid Lab')
}
