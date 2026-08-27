/* Much of this is modeled on strict-mods.js */
import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
    safeSelect,
    copyAttributes,
    moveChildren,
    moveAndTransformElement,
    createElement,
    isElementEmpty,
    hasDirectTextContent
} from './xml-helpers.js'
import {convertPartNumbers, removeEmptyElements} from './strict-mods.js'

/**
 * Main conversion function to convert Syllabus 'courseInfo' XML to MODS
 *
 * @param {string} xmlString - XML string to convert
 * @returns {string} Converted MODS XML string with namespace, ready for validation
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

    // Check for parse errors in the document
    const parseError = doc.getElementsByTagName('parsererror')[0]
    if (parseError) {
        throw new Error(`XML parsing error: ${parseError.textContent}`)
    }

    // Ensure we have a root mods element
    const modsElements = safeSelect("//mods", doc)
    let mods
    if (modsElements.length > 0) {
        mods = modsElements[0] // default to first mods element if multiple exist
    } else {
        mods = createElement(doc, 'mods')
    }
    mods.setAttribute("xmlns", 'http://www.loc.gov/mods/v3')
    mods.setAttribute("version", '3.8')

    // We do this last in strict mods but it might simplify the tree to do it first here
    removeEmptyElements(doc)

    return mods.toString()
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
