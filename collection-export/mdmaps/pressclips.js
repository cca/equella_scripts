/* Much of this is modeled on strict-mods.js */
import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
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
 * Converts a depicted person in the local communications wrapper to a MODS subject name element.
 * @param {Document} doc - XML document
 * @returns {Document}
 */
function depictedPersonToSubjectName(doc) {
    const depictedPerson = safeSelect("//local/communicationsWrapper/depictedWrapper/depictedPerson", doc)
    for (const person of depictedPerson) {
        if (person && hasDirectTextContent(person)) {
            const subjectName = createElement(doc, "subject")
            const name = createElement(doc, "name", person.textContent)
            name.setAttribute("type", "personal")
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

    // ? how to handle publication? relatedItem@type=host? drop the Press Clips relatedItem then?

    // local/communicationsWrapper/depictedWrapper/depictedPerson -> mods/subject/name@type=personal
    depictedPersonToSubjectName(doc)

    // ? what about the yes/no communicationsWrapper/ccaNamed? convert to a note?

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
