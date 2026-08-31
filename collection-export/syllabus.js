/* Much of this is modeled on strict-mods.js */
import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
    safeSelect,
    safeSelectFirst,
    createElement,
    hasDirectTextContent
} from './xml-helpers.js'
import {convertPartNumbers, moveAndRenameElement, removeEmptyElements} from './strict-mods.js'

/**
 * Add a role/roleTerm child to a parent element assuming marcrelator authority.
 * Used by personalNames and corporateName functions.
 * @param   {Element}  parent    Parent (name) element to which the roleTerm is added
 * @param   {string}   roleTerm  Text content of the roleTerm element
 * @param   {string}   valueURI  URI for the roleTerm (optional)
 * @return  {Element|null}       The created roleTerm element, or null if parent or roleTerm is not provided
 */
export function addRoleTerm(parent, roleTerm, valueURI = 'marcrelator') {
    if (!parent || !roleTerm) return null

    const roleElement = createElement(parent.ownerDocument, 'role')
    parent.appendChild(roleElement)
    const roleTermElement = createElement(parent.ownerDocument, 'roleTerm')
    roleTermElement.textContent = roleTerm

    // Set attributes
    roleTermElement.setAttribute('authority', 'marcrelator')
    roleTermElement.setAttribute('authorityURI', 'http://id.loc.gov/vocabulary/relators')
    if (valueURI) roleTermElement.setAttribute('valueURI', valueURI)

    roleElement.appendChild(roleTermElement)

    return roleTermElement
}

/**
 * Remove " (B|MFA)" from end of string
 * @param   {string}  string  Department name possibly with degree postfix
 * @return  {string}          Department name without degree postfix
 */
export function trimDegreePostfix(string) {
    if (typeof string !== 'string') return string
    return string.trim().replace(/\s+\([A-Z]+\)$/, '')
}

/**
 * Add a mods/name@type=corporate for the division & program
 * @param   {Document}  doc  XML document
 * @return  {Document}       transformed document
 */
export function corporateName(doc) {
    const department = safeSelectFirst("//local/department", doc)
    const division = safeSelectFirst("//local/division", doc)
    const mods = safeSelectFirst("//mods", doc)

    if (hasDirectTextContent(department) || hasDirectTextContent(division)) {
        const nameElement = createElement(doc, 'name')
        nameElement.setAttribute('type', 'corporate')
        mods.appendChild(nameElement)

        if (hasDirectTextContent(department)) {
            const namePart = createElement(doc, 'namePart')
            namePart.textContent = trimDegreePostfix(department.textContent)
            nameElement.appendChild(namePart)
        }

        if (hasDirectTextContent(division)) {
            const namePart = createElement(doc, 'namePart')
            namePart.textContent = division.textContent
            nameElement.appendChild(namePart)
        }

        addRoleTerm(nameElement, 'sponsor', 'http://id.loc.gov/vocabulary/relators/spn')
    }

    return doc
}

/**
 * Adds personal name elements for all faculty
 * @param   {Document} doc   XML document
 * @returns {Document}       transformed document
 */
export function personalNames(doc) {
    const facultyElement = safeSelectFirst("//local/courseInfo/faculty", doc)
    const mods = safeSelectFirst("//mods", doc)

    if (hasDirectTextContent(facultyElement)) {
        const names = facultyElement.textContent.split(', ').map(name => name.trim()).filter(name => name.length > 0)
        names.forEach(name => {
            let nameElement = createElement(doc, 'name')
            nameElement.setAttribute('type', 'personal')
            let namePart = createElement(doc, 'namePart')
            namePart.textContent = name
            nameElement.appendChild(namePart)
            mods.appendChild(nameElement)
            addRoleTerm(nameElement, 'teacher', 'http://id.loc.gov/vocabulary/relators/tch')
        })
    }

    // usernames list -> nameIdentifier elements
    const facultyID = safeSelectFirst("//local/courseInfo/facultyID", doc)
    const usernames = facultyID ? facultyID.textContent.split(', ')
        .map(id => id.trim())
        .filter(id => id.length > 0) : []
    const nameElements = safeSelect("//mods/name[@type='personal']", doc)

    // sanity check: only add nameIdentifier if we have the same number of usernames as names
    if (usernames.length !== nameElements.length) {
        return doc
    }

    for (let i = 0; i < usernames.length; i++) {
        const nameIdentifier = createElement(doc, 'nameIdentifier')
        nameIdentifier.setAttribute('type', 'email')
        nameIdentifier.setAttribute('typeURI', 'https://datatracker.ietf.org/doc/html/rfc5322')
        nameIdentifier.setAttribute('displayLabel', 'Email')
        nameIdentifier.textContent = `${usernames[i]}@cca.edu`
        nameElements[i].appendChild(nameIdentifier)
    }

    return doc
}

/**
 * Adds a static mods/genre = 'syllabi' element
 * @param   {Document}  doc  XML document
 * @returns {Document}       transformed document
 */
export function addGenre(doc) {
    const genre = createElement(doc, 'genre')
    genre.setAttribute('authority', 'aat')
    genre.setAttribute('authorityURI', 'http://vocab.getty.edu/aat/')
    genre.setAttribute('valueURI', 'http://vocab.getty.edu/aat/300028026')
    genre.textContent = 'syllabi'
    const mods = safeSelectFirst("//mods", doc)
    mods.appendChild(genre)

    return doc
}

/**
 * local/courseInfo/courseName -> mods/identifier[@type="course number"]
 * local/courseInfo/section -> mods/identifier[@type="section"]
 * @param   {Document}  doc  XML document
 * @returns {Document}       transformed document
 */
function addIdentifiers(doc) {
    const courseCode = safeSelectFirst("//local/courseInfo/courseName", doc)
    const sectionCode = safeSelectFirst("//local/courseInfo/section", doc)
    const mods = safeSelectFirst("//mods", doc)

    if (hasDirectTextContent(courseCode)) {
        const identifier = createElement(doc, 'identifier')
        identifier.setAttribute('type', 'course number')
        identifier.textContent = courseCode.textContent
        mods.appendChild(identifier)
    }

    if (hasDirectTextContent(sectionCode)) {
        const identifier = createElement(doc, 'identifier')
        identifier.setAttribute('type', 'section')
        identifier.textContent = sectionCode.textContent
        mods.appendChild(identifier)
    }

    return doc
}

/**
 * Map CCA degree programs to AAT vocabulary terms with URIs
 * e.g. Fashion Design ->
 * {"value": "fashion design", "valueURI": "https://vocab.getty.edu/aat/300138708",
 * "authority": "aat", "authorityURI":"http://vocab.getty.edu/aat/"}
 * @key {string} lowercase, trimmed CCA degree program name, no degree postfix
 * @value {object} AAT term object with value, valueURI, authority, authorityURI
 */
export const PROGRAM_SUBJECT_MAP = {
    "animation": {
        "value": "animation (visual works)",
        "valueURI": "https://vocab.getty.edu/aat/300411663",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "architecture": {
        "value": "architecture (discipline)",
        "valueURI": "https://vocab.getty.edu/aat/300054156",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "ceramics": {
        "value": "studio ceramics",
        "valueURI": "https://vocab.getty.edu/aat/300185650",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "comics": {
        "value": "comics (documents)",
        "valueURI": "https://vocab.getty.edu/aat/300015635",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "craft": {
        "value": "crafts (art genres)",
        "valueURI": "https://vocab.getty.edu/aat/300054704",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "curatorial practice": {
        "value": "curating",
        "valueURI": "https://vocab.getty.edu/aat/300054277",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "design": {
        "value": "design (discipline)",
        "valueURI": "http://vocab.getty.edu/aat/300054171",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "design strategy": {
        "value": "business (commercial function)", // MBA so we use business
        "valueURI": "https://vocab.getty.edu/aat/300054343",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "critical ethnic studies": {
        "value": "antiracist", // closest conceptually in AAT
        "valueURI": "https://vocab.getty.edu/aat/300449021",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "fashion design": {
        "value": "fashion design",
        "valueURI": "https://vocab.getty.edu/aat/300138708",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "film": {
        "value": "film (discipline)",
        "valueURI": "https://vocab.getty.edu/aat/300054141",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "fine arts": {
        "value": "fine arts (discipline)",
        "valueURI": "https://vocab.getty.edu/aat/300054195",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "furniture": {
        "value": "furniture",
        "valueURI": "https://vocab.getty.edu/aat/300037680",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "game arts": {
        "value": "games",
        "valueURI": "https://vocab.getty.edu/aat/300069657",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "glass": {
        "value": "glassworking",
        "valueURI": "https://vocab.getty.edu/aat/300053929",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "graphic design": {
        "value": "graphic design",
        "valueURI": "https://vocab.getty.edu/aat/300054181",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "communication design": { // aka graphic design
        "value": "graphic design",
        "valueURI": "https://vocab.getty.edu/aat/300054181",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "illustration": {
        "value": "illustration (process)",
        "valueURI": "https://vocab.getty.edu/aat/300054200",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "industrial design": {
        "value": "industrial design",
        "valueURI": "https://vocab.getty.edu/aat/300054183",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "history of art and visual culture": {
        "value": "art history",
        "valueURI": "https://vocab.getty.edu/aat/300054233",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "interior design": {
        "value": "interior design",
        "valueURI": "https://vocab.getty.edu/aat/300054184",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "interaction design": {
        "value": "interactive art", // nothing closer in AAT or LCSH
        "valueURI": "https://vocab.getty.edu/aat/300266754",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "jewelry / metal arts": {
        "value": "jewelry making",
        "valueURI": "https://vocab.getty.edu/aat/300053611",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "photography": {
        "value": "photography (process)",
        "valueURI": "https://vocab.getty.edu/aat/300054225",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "painting/drawing": {
        "value": "paintings (visual works)",
        "valueURI": "http://vocab.getty.edu/aat/300033618",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "printmedia": {
        "value": "printmaking",
        "valueURI": "https://vocab.getty.edu/aat/300131119",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "sculpture": {
        "value": "sculpture (visual works)",
        "valueURI": "https://vocab.getty.edu/aat/300047090",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "textiles": {
        "value": "textiles (visual works)",
        "valueURI": "https://vocab.getty.edu/aat/300014063",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "writing": {
        "value": "writing (processes)",
        "valueURI": "https://vocab.getty.edu/aat/300054698",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
    "writing & literature": {
        "value": "literature (documents)",
        "valueURI": "https://vocab.getty.edu/aat/300180362",
        "authority": "aat",
        "authorityURI": "http://vocab.getty.edu/aat/"
    },
}

/**
 * semester -> mods/subject/temporal
 * local/department -> strip degree postfix -> mods/subject/topic
 * @param   {Document}  doc  XML document
 * @returns {Document}       transformed document
 */
export function addSubjects(doc) {
    const semester = safeSelectFirst("//local/courseInfo/semester", doc)
    const department = safeSelectFirst("//local/department", doc)
    const mods = safeSelectFirst("//mods", doc)

    if (hasDirectTextContent(semester)) {
        const temporal = createElement(doc, 'temporal')
        temporal.textContent = semester.textContent
        let subjectParent = safeSelectFirst("//mods/subject", doc)
        if (!subjectParent) {
            subjectParent = createElement(doc, 'subject')
            mods.appendChild(subjectParent)
        }
        subjectParent.appendChild(temporal)
    }

    if (hasDirectTextContent(department)) {
        const topic = createElement(doc, 'topic')
        // Strip degree postfixes like " (BFA)" or " (MFA)"
        const topicText = trimDegreePostfix(department.textContent)
        // See if we can find a better subject term in AAT than the program name
        const vocabTerm = PROGRAM_SUBJECT_MAP[topicText.toLowerCase().replace(" program", "")]
        if (vocabTerm) {
            topic.textContent = vocabTerm.value
            topic.setAttribute("valueURI", vocabTerm.valueURI)
            topic.setAttribute("authority", vocabTerm.authority)
            topic.setAttribute("authorityURI", vocabTerm.authorityURI)
        } else {
            topic.textContent = topicText
        }

        let subjectParent = safeSelectFirst("//mods/subject", doc)
        if (!subjectParent) {
            subjectParent = createElement(doc, 'subject')
            mods.appendChild(subjectParent)
        }
        subjectParent.appendChild(topic)
    }

    return doc
}

/**
 * local/courseInfo/courseNumer & course -> mods/titleInfo/title
 * local/courseInfo/semester -> mods/part/partNumber
 * @param   {Document}  doc  XML document
 * @returns {Document}       transformed document
 */
export function fixSyllabusTitle(doc) {
    const courseNumber = safeSelectFirst("//local/courseInfo/courseName", doc)
    const courseTitle = safeSelectFirst("//local/courseInfo/course", doc)
    const semester = safeSelectFirst("//local/courseInfo/semester", doc)

    if (hasDirectTextContent(courseNumber) || hasDirectTextContent(courseTitle)) {
        // wipe out existing titleInfo element
        const existingTitleInfo = safeSelectFirst("//mods/titleInfo", doc)
        if (existingTitleInfo) {
            existingTitleInfo.parentNode.removeChild(existingTitleInfo)
        }

        // Add new titleInfo parent to mods
        const titleInfo = createElement(doc, 'titleInfo')
        const mods = safeSelectFirst("//mods", doc)
        mods.appendChild(titleInfo)

        // Create title
        const title = createElement(doc, 'title')
        title.textContent = (courseNumber ? courseNumber.textContent : '') + (courseNumber && courseTitle ? ' ' : '') + (courseTitle ? courseTitle.textContent : '')
        titleInfo.appendChild(title)

        // Add partNumber for semester
        if (semester) {
            const partNumber = createElement(doc, 'partNumber')
            partNumber.textContent = semester.textContent
            titleInfo.appendChild(partNumber)
        }
    }

    return doc
}

/**
 * Add originInfo/dateIssued based on local/courseInfo/semseter
 * @param   {Document}  doc  XML document
 * @returns {Document}       transformed document
 */
export function addOriginInfo(doc) {
    const semester = safeSelectFirst("//local/courseInfo/semester", doc)

    if (hasDirectTextContent(semester)) {
        const yearMatch = semester.textContent.match(/(\d{4})$/)
        const year = yearMatch ? yearMatch[1] : null
        // we have to have at least a year, season on its own is meaningless
        if (!year) return doc

        const seasonMatch = semester.textContent.match(/^(Spring|Summer|Fall)/i)
        const season = seasonMatch ? seasonMatch[1].toLowerCase() : null
        let date

        // map semester seasonal term to the first month so we can make an EDTF date
        // Spring = Jan, Summer = May, Fall = Sept
        switch (season) {
        case 'spring':
            date = `${year}-01`
            break
        case 'summer':
            date = `${year}-05`
            break
        case 'fall':
            date = `${year}-09`
            break
        default:
            date = year
        }

        if (date) {
            const originInfo = createElement(doc, 'originInfo')
            const dateIssued = createElement(doc, 'dateIssued')
            dateIssued.textContent = date
            dateIssued.setAttribute('encoding', 'edtf')
            originInfo.appendChild(dateIssued)
            const mods = safeSelectFirst("//mods", doc)
            mods.appendChild(originInfo)
        }
    }

    return doc
}

/**
 * Add a mods/note with the whole hierarchy of course information
 * @param   {Document}  doc  XML document
 * @returns {Document}       transformed document
 */
export function addFullCourseInfoNote(doc) {
    const semester = safeSelectFirst("//local/courseInfo/semester", doc)
    const division = safeSelectFirst("//local/division", doc)
    const department = safeSelectFirst("//local/department", doc)
    const courseNumber = safeSelectFirst("//local/courseInfo/courseName", doc)
    const courseTitle = safeSelectFirst("//local/courseInfo/course", doc)
    const section = safeSelectFirst("//local/courseInfo/section", doc)
    const faculty = safeSelectFirst("//local/courseInfo/faculty", doc)

    const infoParts = [semester, division, department, courseNumber, courseTitle, section, faculty]
        .filter(el => hasDirectTextContent(el))
        .map(el => el.textContent.trim())

    if (infoParts.length > 0) {
        const mods = safeSelectFirst("//mods", doc)
        const note = createElement(doc, 'note')
        note.textContent = infoParts.join(' | ')
        mods.appendChild(note)
    }

    return doc
}

/**
 * Main conversion function to convert Syllabus 'courseInfo' XML to MODS
 * @param   {string} xmlString  XML string to convert
 * @returns {Document}          Converted MODS XML string with namespace, ready for validation
 * @throws  {Error}             If XML is malformed, cannot be parsed, or input is invalid
 */
export function convertSyllabusXMLtoMODS(xmlString) {
    // Handle invalid input types
    if (typeof xmlString !== 'string') {
        throw new Error('XML input must be a string')
    }

    // Handle empty input
    if (!xmlString.trim()) {
        throw new Error('XML input cannot be empty')
    }

    const parser = new xmldom()
    let doc

    try {
        doc = parser.parseFromString(xmlString, 'text/xml')
    } catch (error) {
        throw new Error(`Failed to parse XML: ${error.message}`, { cause: error })
    }

    // Ensure we have one and only one <mods> element, creating one if necessary
    const modsElements = safeSelect("//mods", doc)
    let mods
    if (modsElements.length > 0) {
        mods = modsElements[0] // default to first mods element if multiple exist
        // If there are multiple <mods> elements, remove the extras
        for (let i = 1; i < modsElements.length; i++) {
            modsElements[i].parentNode.removeChild(modsElements[i])
        }
    } else {
        mods = createElement(doc, 'mods')
        doc.documentElement.appendChild(mods)
    }
    mods.setAttribute("xmlns", 'http://www.loc.gov/mods/v3')
    mods.setAttribute("version", '3.8')
    mods.setAttribute("xmlns:xsi", 'http://www.w3.org/2001/XMLSchema-instance')
    mods.setAttribute("xsi:schemaLocation", 'http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-8.xsd')

    // Fix titleInfo elements
    fixSyllabusTitle(doc)

    // mods/part/number to part/text @type=attachment-uuid
    convertPartNumbers(doc)

    addGenre(doc)
    addSubjects(doc)
    addIdentifiers(doc)

    // mods/name
    personalNames(doc)
    corporateName(doc)

    addOriginInfo(doc)

    addFullCourseInfoNote(doc)

    // Strip the /local XML tree entirely & make <mods> the new root element
    const local = safeSelectFirst("//local", doc)
    if (local) doc.documentElement.removeChild(local)
    doc.replaceChild(mods, doc.documentElement)

    doc.normalize() // remove empty text nodes and merge adjacent text nodes
    removeEmptyElements(doc) // Remove empty elements, probably unnecessary

    return doc
}

// CLI functionality - run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const fs = await import('fs')
    const path = await import('path')

    const args = process.argv.slice(2)

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        const helpText = `Usage: node syllabus.js <input-file>

Convert EQUELLA custom Syllabus "courseInfo" XML to schema-compliant MODS.
`
        if (args.includes('--help') || args.includes('-h')) {
            console.log(helpText)
            process.exit(0)
        } else {
            console.error(helpText)
            process.exit(1)
        }
    }

    const inputFile = args.find(arg => !arg.startsWith('--'))

    if (!inputFile) {
        console.error('Error: No input file specified')
        process.exit(1)
    }

    try {
        const xmlString = fs.readFileSync(inputFile, 'utf-8')
        const result = convertSyllabusXMLtoMODS(xmlString)
        console.log(result.toString())
    } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
    }
}
