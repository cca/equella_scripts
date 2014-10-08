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
    xml.set('local/assessmentWrapper/date', assessment[0]);
    xml.set('local/assessmentWrapper/type', assessment[1]);
    xml.set('local/assessmentWrapper/program', assessment[2]);
    // two uses for leaf of taxonomy; CCA program or accrediting body
    // if latter, uncomment the line below & comment out line above
    // xml.set('local/assessmentWrapper/organization', assessment[2])
}
