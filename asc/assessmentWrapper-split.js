// Split "Assessment / Accreditation Reviews" taxonomy into separate
// metadata fields under local/assessmentWrapper.
// Best used as an Expert Scripting Save Script but could also
// be an Advanced Scripting Control if date/type/program values
// will be used to selectively reveal later form controls.

// We'll usually ask users to fill out a Term Selector for the
// taxonomy rather than each node individually, since it's quicker,
// but we want to record parsed out individual nodes, too.

var assessmemt = xml.get('local/assessmentWrapper/staging').split("\\\\");

// guard against aW/staging being empty, xml.get returns
// empty string if node is empty, so assessment.length != 0
if (assessment[0] != '') {
    var type = assessment[1];

    xml.set('local/assessmentWrapper/date', assessment[0]);
    xml.set('local/assessmentWrapper/type', type);

    // the taxonomy leaf node has 2 distinct meanings:
    // could be a CCA program for assessment, ext. reviews, etc.
    // or an accrediting body (NASAD, etc.) for accreditation
    if (type == 'External Review' || type == 'Assessment') {
        xml.set('local/assessmentWrapper/program', assessment[2]);
    } else if (type == 'Accreditation') {
        xml.set('local/assessmentWrapper/organization', assessment[2]);
    } else {
        // @todo is this the sensible fallback?
        xml.set('local/assessmentWrapper/program', assessment[2]);
    }
}
