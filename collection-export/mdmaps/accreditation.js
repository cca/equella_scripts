import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
    addArchivesSeries,
    createElement,
    hasDirectTextContent,
    renameElement,
    safeSelect,
    safeSelectFirst,
    setupModsElement,
} from './xml-helpers.js'
import {convertPartNumbers, removeEmptyElements, unwrapDateCreated, unwrapSimpleElement} from './strict-mods.js'

// These are the terms under the Administrative part of the "CCA Departments & Prograns" taxonomy
// which is what the local/department element uses in the EQUELLA contribution wizard
// ? The 4 academic divisions are under Administrative but shouldn't we consider them academic?
const ADMINISTRATIVE_DEPARTMENTS = [
    "Academic Affairs",
    "Advancement",
    "Alumni Relations",
    // "Architecture Division",
    "Business Office",
    "Career Services",
    "Communications",
    // "Design Division",
    "ETS",
    "Enrollment Services (ESO)",
    "Facilities (Oakland)",
    "Facilities (San Francisco)",
    "Financial Aid",
    // "Fine Arts Division",
    "Human Resources",
    // "Humanities and Sciences Division",
    "Libraries",
    "Student Affairs",
    "Student Records",
    "Studio Resources",
]

// DocType ENUM which will be used in 2 places (mapDocumentCategoryToSubject and addArchivesSeries)
const DocType = Object.freeze({
    "ACCREDITATION": Symbol("ACCREDITATION"),
    "ASSESSMENT": Symbol("ASSESSMENT"),
})

/**
 * All items are either Assessment or Accreditation based on their mods/physicalDescription/formSpecific
 * @param {Document} doc - XML Document
 * @returns {DocType<Symbol>} - The determined document type based on the content of the XML document.
 */
function determineDocType(doc) {
    const docCategoryText = safeSelectFirst("//mods/physicalDescription/formSpecific", doc)
    let docType
    switch (docCategoryText?.textContent?.trim()?.toLowerCase()) {
    case 'accreditation':
        docType = DocType.ACCREDITATION
        break
    case 'assessment':
        docType = DocType.ASSESSMENT
        break
    default:
        throw Error("Unknown document category: " + docCategoryText?.textContent)
    }
    return docType
}

/**
 * Add Archives Series based on the document type &
 * (if it's an Assessment document) local/department
 * @param {Document} doc - XML document
 * @param {DocType<Symbol>} docType - Assessment/Accreditation document type
 * @returns {Element|null} The outermost relatedItem element added to <mods>, or null if neither
 *                          series nor subseries were provided, or no <mods> element was found
 */
function docTypeToArchivesSeries(doc, docType) {
    if (docType === DocType.ACCREDITATION) {
        return addArchivesSeries(doc, "I. Administrative Materials", "2. Accreditation and Licensing Materials")
    }
    if (docType === DocType.ASSESSMENT) {
        const departments = safeSelect("//local/department", doc)
            .map(el => el.textContent.trim())
            .filter(dept => dept !== "")
        for (const department of departments) {
            if (ADMINISTRATIVE_DEPARTMENTS.includes(department)) {
                return addArchivesSeries(doc, "IV. Department Materials", "2. Administrative Departments")
            }
        }
        // If no administrative department is found, add academic department
        return addArchivesSeries(doc, "IV. Department Materials", "1. Academic Departments")
    }
}

/**
 * Map document category (Assessment or Accreditation) to a MODS subject/topic element.
 * @param {Document} doc - XML Document
 * @returns {void}
 * @throws {Error} If the document type is not supported
 */
function mapDocumentCategoryToSubject(doc, docType) {
    const mods = safeSelectFirst("//mods", doc)
    const subject = createElement(doc, 'subject')
    const topic = createElement(doc, 'topic')
    topic.setAttribute('authority', 'lcsh')
    topic.setAttribute('authorityURI', 'http://id.loc.gov/authorities/subjects')

    if (docType === DocType.ASSESSMENT) {
        topic.textContent = 'Assessment'
        topic.setAttribute('valueURI', 'http://id.loc.gov/authorities/subjects/sh85045926')
    } else if (docType === DocType.ACCREDITATION) {
        topic.textContent = 'Accreditation (Education)'
        topic.setAttribute('valueURI', 'http://id.loc.gov/authorities/subjects/sh85000437')
    }

    // add the created elements to the document
    subject.appendChild(topic)
    mods.appendChild(subject)

    // remove the physicalDescription element
    mods.removeChild(mods.getElementsByTagName("physicalDescription")[0])
}

/**
 * move mods/subject/name to mods/subject/name/namePart
 * & add type=corporate attribute to name
 * @param {Document} - XML document
 * @returns {void}
 */
function fixSubjectName(doc) {
    const accreditationOrgs = safeSelect("//mods/subject/name", doc)
    for (const org of accreditationOrgs) {
        if (hasDirectTextContent(org)) {
            const namePart = createElement(doc, 'namePart', org.textContent)
            org.removeChild(org.firstChild)
            org.appendChild(namePart)
            org.setAttribute('type', 'corporate')
        }
    }
}

/**
 * Move local/department elements to MODS subject/name@type=corporate/namePart
 * @param {Document} doc - XML Document
 * @returns {void}
 */
function departmentsToSubjectName(doc) {
    const departments = safeSelect("//local/department", doc)
    const mods = safeSelectFirst("//mods", doc)
    for (const dept of departments) {
        if (hasDirectTextContent(dept)) {
            const name = createElement(doc, 'name')
            const subject = createElement(doc, 'subject')
            name.setAttribute('type', 'corporate')
            const namePart = createElement(doc, 'namePart', dept.textContent)
            name.appendChild(namePart)
            subject.appendChild(name)
            mods.appendChild(subject)
        }
        dept.parentElement.removeChild(dept)
    }
}

/**
 * A few dates fixes: originInfo capitalization and add date encoding, convert semesterCreated
 * to dateCreated
 * @param {Document} doc - XML document containing the MODS data
 * @returns {void}
 */
function fixOriginInfoDates(doc) {
    unwrapDateCreated(doc)
    renameElement(doc, "origininfo", "originInfo", "//mods")
    const dateCreated = safeSelectFirst("//mods/originInfo/dateCreated", doc)
    if (hasDirectTextContent(dateCreated)) {
        dateCreated.setAttribute("encoding", "edtf")
    }
    const semesterCreated = safeSelectFirst("//mods/originInfo/semesterCreated", doc)
    if (hasDirectTextContent(semesterCreated)) {
        renameElement(doc, "semesterCreated", "dateCreated", "//mods/originInfo")
    }
}

/**
 * Main conversion function to convert "Assessment & Accreditation Documents" XML to MODS
 * @param   {string} xmlString  XML string to convert
 * @returns {Document}          Converted MODS XML string with namespace, ready for validation
 * @throws  {Error}             If XML is malformed, cannot be parsed, or input is invalid
 */
export function convertAccreditationXMLtoMODS(xmlString) {
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
    let mods = setupModsElement(doc)

    // Do this first, used in mapDocumentCategoryToSubject & addArchivesSeries
    const docType = determineDocType(doc)

    // add typeOfResource = text
    const typeOfResource = createElement(doc, 'typeOfResource', 'text')
    mods.appendChild(typeOfResource)

    // mods/genreWrapper/genre -> mods/genre
    // TODO we could map these doc types to LCGFT or AAT forms
    unwrapSimpleElement(doc, 'genreWrapper', "//mods")

    // I. Admin 2. Accred. if docType = Assessment
    // IV. Department Materials > 1. Academic if it has an academic program, 2. Admin otherwise
    // ! This must come before departmentsToSubjectName because it uses local/department
    docTypeToArchivesSeries(doc, docType)

    // map Assessment/Accreditation category to mods/subject/topic
    mapDocumentCategoryToSubject(doc, docType)

    // Accreditation Organization (can be multiple) in subject/name
    fixSubjectName(doc)

    // /local/department -> mods/subject/name@type=corporate
    departmentsToSubjectName(doc)

    // standardize dates in origininfo & fix its casing
    fixOriginInfoDates(doc)

    // mods/part/number to part/text @type=attachment-uuid
    convertPartNumbers(doc)

    // Make <mods> the new root element (drops /local branch of XML tree)
    doc.replaceChild(mods, doc.documentElement)
    removeEmptyElements(mods)
    doc.normalize() // remove empty text nodes and merge adjacent text nodes

    return doc
}

// CLI functionality - run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const fs = await import('fs')
    const args = process.argv.slice(2)

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        const helpText = `Usage: node accreditation.js <input-file>

Convert "Assessment & Accreditation Documents" XML to schema-compliant MODS.
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
        const result = convertAccreditationXMLtoMODS(xmlString)
        console.log(result.toString())
    } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
    }
}
