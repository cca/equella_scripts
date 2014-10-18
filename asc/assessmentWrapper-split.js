// Split "Assessment / Accreditation Reviews" taxonomy into separate
// metadata fields under local/assessmentWrapper.
// Best used as an Expert Scripting Save Script but could also
// be an Advanced Scripting Control if date/type/program values
// will be used to selectively reveal later form controls.

// We'll usually ask users to fill out a Term Selector for the
// taxonomy rather than each node individually, since it's quicker,
// but we want to record parsed out individual nodes, too.

var assessment = xml.get('local/assessmentWrapper/staging').split("\\\\");

// guard against staging being empty string, assessment.length != 0
if (assessment[0] != '') {
    // just used for conditions below
    var type = assessment[1].toLowerCase();

    xml.set('local/assessmentWrapper/date', assessment[0]);
    xml.set('local/assessmentWrapper/type', assessment[1]);

    // the taxonomy leaf node has 2 distinct meanings:
    // could be a CCA program for assessment, ext. reviews, etc.
    // or an accrediting body (NASAD, etc.) for accreditation
    if (type.indexOf('external review') != -1 || type.indexOf('assessment') != -1 ) {
        xml.set('local/assessmentWrapper/program', assessment[2]);
    } else if (type.indexOf('accreditation') != -1 ) {
        xml.set('local/assessmentWrapper/organization', assessment[2]);
    } else {
        // sensible fallback, we assume it's a program activity
        xml.set('local/assessmentWrapper/program', assessment[2]);
    }

    // we use local/accreditation as a human-readable summary
    // makes usage in display templates easier
    xml.set('local/accreditation', assessment.join(' '));
}
