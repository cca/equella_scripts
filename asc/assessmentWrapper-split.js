// Split "Assessment / Accreditation Reviews" taxonomy into separate
// metadata fields under local/assessmentWrapper.
// Best used as an Expert Scripting Save Script but could also
// be an Advanced Scripting Control if date/type/program values
// will be used to selectively reveal later form controls.

// We'll usually ask users to fill out a Term Selector for the
// taxonomy rather than each node individually, since it's quicker,
// but we want to record parsed out individual nodes, too.

var xp = 'local/assessmentWrapper'
// adding support for _multiple_ reviews on one item
var stagings = xml.list(xp + '/staging').listIterator()
// wipe out the assessment nodes we'll populate below
xml.deleteAll('local/accreditation')
xml.deleteAll(xp)

// guard against staging being empty
while (stagings.hasNext()) {
    // text value of staging string, also iterates to next node
    var assessment = stagings.next()
    // needed for XPaths below, must run after above
    var index = stagings.nextIndex()
    // only need to set this once & only if there's a stagings value
    xml.set(xp + '/useInReview', 'yes')

    // assessment type is either the 2nd term in the taxonomy path:
    //     Fall 2014\External Review\Photography
    // or a data key on the final term:
    //     Spring 2016\CIDA\Interior Design(type: accreditation)
    // in latter case, we also record 2nd term in path as assessment org
    var taxo = data.getTaxonomyByUuid('34e45a42-3352-4a70-99bd-2a05da9bebb4')
    var term = taxo.getTerm(assessment)
    // guard against term not being in taxonomy
    if (term) {
        var type = term.getData('type')
        var pieces = String(assessment).split('\\')
        // trust me, I've tried a million other ways of doing this, none work
        // DO NOT waste time with xml.add/set(xp + index), doesn't work
        // DO NOT waste time with xml.createSubtree(xp), doesn't work
        // DO NOT waste time creating an XML document with utils.newXmlDocumentFromString
        // & then adding it with xml.appendChildren

        if (type !== null) {
            xml.add(xp + '/type', type.toLowerCase())
            xml.add(xp + '/organization', pieces[1])
        } else {
            xml.add(xp + '/type', pieces[1].toLowerCase())
        }

        xml.add(xp + '/date', pieces[0])
        xml.add(xp + '/program', pieces[2])
        xml.add(xp + '/staging', assessment)

        // we use local/accreditation as a human-readable summary
        // makes usage in display templates easier
        xml.add('local/accreditation', pieces.join(' '))
    }
}

// in the case that a previously-used item is removed from a review
// we wipe out all the info.
if (xml.contains(xp + '/useInReview', 'no')) {
    xml.deleteAll('local/accreditation')
    xml.deleteAll(xp)
}
