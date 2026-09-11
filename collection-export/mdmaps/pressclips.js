import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
    addArchivesSeries,
    addRoleTerm,
    createElement,
    hasDirectTextContent,
    renameElement,
    safeSelect,
    safeSelectFirst,
    setupModsElement,
} from './xml-helpers.js'
import {convertPartNumbers, removeEmptyElements, unwrapDateCreated} from './strict-mods.js'

/**
 * Move mods/relateditem/title to mods/relatedItem[@type='host']/titleInfo/title
 * @param {Document} doc - XML document
 * @returns {Document} Modified XML document with the host title moved if applicable
 */
function fixPublication(doc) {
    renameElement(doc, "relateditem", "relatedItem", "//mods")
    const relatedItem = safeSelectFirst("//mods/relatedItem", doc)
    if (relatedItem) {
        const titles = relatedItem.getElementsByTagName('title')
        const title = titles.length > 0 ? titles[0] : null
        if (hasDirectTextContent(title)) {
            const titleInfo = createElement(doc, 'titleInfo')
            titleInfo.appendChild(title)
            relatedItem.appendChild(titleInfo)
        }
        relatedItem.setAttribute('type', 'host')
    }
    return doc
}

/**
 * Converts a depicted person in the local communications wrapper to a MODS subject name element.
 * @param {Document} doc - XML document
 * @returns {Document}
 */
function depictedPersonToSubjectName(doc) {
    const depictedPerson = safeSelect("//local/communicationsWrapper/depictedWrapper/depictedPerson", doc)
    for (const person of depictedPerson) {
        if (person && hasDirectTextContent(person)) {
            const subjectName = createElement(doc, "subject")
            const name = createElement(doc, "name")
            name.setAttribute("type", "personal")
            const namePart = createElement(doc, "namePart", person.textContent)
            name.appendChild(namePart)
            subjectName.appendChild(name)
            const mods = safeSelectFirst("//mods", doc)
            if (mods) {
                mods.appendChild(subjectName)
            }
        }
    }

    return doc
}

/**
 * If ccaNamed element is "yes", add a mods note about it
 * @param {Document} doc - XML document
 * @returns {Document} Modified XML document with the note added if applicable
 */
function ccaNamedNote(doc) {
    const ccaNamedElements = safeSelect("//local/communicationsWrapper/ccaNamed", doc)
    const ccaNamed = ccaNamedElements.some(el => el.textContent.trim().toLowerCase() === 'yes')
    if (ccaNamed) {
        const note = createElement(doc, 'note', 'California College of the Arts was mentioned in the text.')
        const mods = safeSelectFirst("//mods", doc)
        mods.appendChild(note)
    }
    return doc
}

/**
 * Add VII. Press > 1. Press Clippings archives series
 * @param {Document} doc - XML document
 * @returns {Document} Modified XML document with the press clippings series added
 */
function addPressClippingsSeries(doc) {
    addArchivesSeries(doc, 'VII. Press', '1. Press Clippings')
    return doc
}

/**
 * Main conversion function to convert Press Clips XML to MODS
 * @param   {string} xmlString  XML string to convert
 * @returns {Document}          Converted MODS XML string with namespace, ready for validation
 * @throws  {Error}             If XML is malformed, cannot be parsed, or input is invalid
 */
export function convertPressClipsXMLtoMODS(xmlString) {
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

    // add typeOfResource = text
    const typeOfResource = createElement(doc, 'typeOfResource', 'text')
    mods.appendChild(typeOfResource)

    // add genre = Periodicals
    const genre = createElement(doc, 'genre', 'Periodicals', {
        authority: 'marcgt',
        authorityURI: 'http://id.loc.gov/authorities/genreForms',
        valueURI: 'http://id.loc.gov/authorities/genreForms/gf2014026139'
    })
    mods.appendChild(genre)

    // mods/part/number to part/text @type=attachment-uuid
    convertPartNumbers(doc)

    // origininfo/dateCreatedWrapper/dateCreated -> originInfo/dateCreated
    unwrapDateCreated(doc)
    renameElement(doc, "origininfo", "originInfo", "//mods")
    const dateCreated = safeSelectFirst("//mods/originInfo/dateCreated", doc)
    if (hasDirectTextContent(dateCreated)) {
        dateCreated.setAttribute("encoding", "w3cdtf")
    }

    // add author role to mods/name and @type=personal
    const name = safeSelectFirst("//mods/name", doc)
    if (name) {
        addRoleTerm(name, 'author', 'http://id.loc.gov/vocabulary/relators/aut')
        name.setAttribute("type", "personal")
    }

    // ! Do these in this exact order to simplify relatedItem handling
    // Remove the relatedItem (note capitalization) @type=host = Press Clips element
    const hostRelatedItem = safeSelectFirst("//mods/relatedItem[@type='host']", doc)
    if (hostRelatedItem) hostRelatedItem.parentNode.removeChild(hostRelatedItem)
    // publication (relateditem/title, note lowercase) to relatedItem@type=host/titleInfo/title
    fixPublication(doc)
    // Add the Press Clippings series from the archive series
    addPressClippingsSeries(doc)

    // local/communicationsWrapper/depictedWrapper/depictedPerson -> mods/subject/name@type=personal
    depictedPersonToSubjectName(doc)

    // communicationsWrapper/ccaNamed = yes -> add a note that CCA was named in the article
    ccaNamedNote(doc)

    // Make <mods> the new root element (drops /local branch of XML tree)
    doc.replaceChild(mods, doc.documentElement)
    removeEmptyElements(mods)
    doc.normalize() // remove empty text nodes and merge adjacent text nodes

    return mods
}

// CLI functionality - run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const fs = await import('fs')
    const args = process.argv.slice(2)

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        const helpText = `Usage: node pressclips.js <input-file>

Convert EQUELLA custom Press Clips XML to schema-compliant MODS.
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
        const result = convertPressClipsXMLtoMODS(xmlString)
        console.log(result.toString())
    } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
    }
}
