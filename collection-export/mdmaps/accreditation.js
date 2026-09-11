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

    // add typeOfResource = text
    const typeOfResource = createElement(doc, 'typeOfResource', 'text')
    mods.appendChild(typeOfResource)

    // TODO mods/genre equal to the type of doc, no authority (or map to an authority)

    // origininfo/dateCreatedWrapper/dateCreated -> originInfo/dateCreated
    unwrapDateCreated(doc)
    renameElement(doc, "origininfo", "originInfo", "//mods")
    const dateCreated = safeSelectFirst("//mods/originInfo/dateCreated", doc)
    if (hasDirectTextContent(dateCreated)) {
        dateCreated.setAttribute("encoding", "edtf")
    }

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
