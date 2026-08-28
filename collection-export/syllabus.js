/* Much of this is modeled on strict-mods.js */
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
    safeSelect,
    safeSelectFirst,
    copyAttributes,
    moveChildren,
    moveAndTransformElement,
    createElement,
    isElementEmpty,
    hasDirectTextContent
} from './xml-helpers.js'
import {convertPartNumbers, moveAndRenameElement, removeEmptyElements} from './strict-mods.js'

// TODO handle username as nameIdentifier
// TODO originInfo/dateIssued with month mapping for semester
// TODO note with the full course info hierarchy written out

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
 * @param {Document} doc  XML document
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

    return doc
}

/**
 * Adds a static mods/genre = 'syllabi' element
 * @param   {Document}  doc  XML document
 * @returns  {Document}       transformed document
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
 * @returns  {Document}       transformed document
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
 * semester -> mods/subject/temporal
 * local/department -> strip degree postfix -> mods/subject/topic
 * @param   {Document}  doc  XML document
 * @returns  {Document}       transformed document
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
        // TODO we could have a better map of department names to subject terms with URIs
        // TODO terms like "Individualized" are not informative
        const topic = createElement(doc, 'topic')
        // Strip degree postfixes like " (BFA)" or " (MFA)"
        topic.textContent = trimDegreePostfix(department.textContent)
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
 * @returns  {Document}       transformed document
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
 * Main conversion function to convert Syllabus 'courseInfo' XML to MODS
 * @param {string} xmlString - XML string to convert
 * @returns {Document} Converted MODS XML string with namespace, ready for validation
 * @throws {Error} If XML is malformed, cannot be parsed, or input is invalid
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

    // Remove empty elements last, after all transformations are complete
    removeEmptyElements(doc)

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
        // Return only <mods> part of XML tree
        const mods = safeSelectFirst("//mods", result)
        console.log(mods.toString())
    } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
    }
}
