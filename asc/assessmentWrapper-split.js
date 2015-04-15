// Split "Assessment / Accreditation Reviews" taxonomy into separate
// metadata fields under local/assessmentWrapper.
// Best used as an Expert Scripting Save Script but could also
// be an Advanced Scripting Control if date/type/program values
// will be used to selectively reveal later form controls.

// We'll usually ask users to fill out a Term Selector for the
// taxonomy rather than each node individually, since it's quicker,
// but we want to record parsed out individual nodes, too.

var xp = 'local/assessmentWrapper/staging'
var assessment = xml.get(xp).split("\\\\")

// guard against staging being empty
if (xml.exists(xp)) {
    // assessment type is either 2nd term in the taxonomy path
    // e.g. Fall 2014\External Review\Photography
    // or is a data key on the final term
    // e.g. Spring 2016\CIDA\Interior Design(type: accreditation)
    // in latter case, we also record 2nd term in path as assessment org
    var taxo = data.getTaxonomyByUuid('34e45a42-3352-4a70-99bd-2a05da9bebb4')
    var term = taxo.getTerm(xml.get(xp))
    var type = term.getData('type')

    if (type !== null) {
        xml.set('local/assessmentWrapper/type', type.toLowerCase())
        xml.set('local/assessmentWrapper/organization', assessment[1])
    } else {
        xml.set('local/assessmentWrapper/type', assessment[1].toLowerCase())
    }

    xml.set('local/assessmentWrapper/date', assessment[0])
    xml.set('local/assessmentWrapper/program', assessment[2])

    // we use local/accreditation as a human-readable summary
    // makes usage in display templates easier
    xml.set('local/accreditation', assessment.join(' '))
} else {
    xml.deleteAll('local/assessmentWrapper')
}
