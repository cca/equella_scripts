import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'

/**
 * Convert EQUELLA's custom MODS XML to strict MODS schema-compliant XML
 * by unwrapping wrapper elements and removing non-standard elements
 */

/**
 * Simple unwrapper for elements that just wrap a single child element
 * Replaces wrapper element with its child element(s)
 *
 * @param {Document} doc - XML DOM document
 * @param {string} wrapperName - Name of the wrapper element to unwrap
 * @param {string} [context='//mods'] - XPath context to search within (default: //mods)
 * @returns {Document} Modified document
 */
export function unwrapSimpleElement(doc, wrapperName, context = '//mods') {
    const select = xpath.useNamespaces({})
    const wrappers = select(`${context}//${wrapperName}`, doc)

    for (let wrapper of wrappers) {
        const parent = wrapper.parentNode

        // Move all child nodes to the parent, replacing the wrapper
        while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, wrapper)
        }

        // Remove the now-empty wrapper
        parent.removeChild(wrapper)
    }

    return doc
}

/**
 * Main conversion function to convert custom MODS to strict MODS
 *
 * @param {string} xmlString - XML string to convert
 * @returns {string} Converted XML string
 */
export function toStrictMODS(xmlString) {
    const parser = new xmldom()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    // Apply simple unwrapping transformations
    unwrapSimpleElement(doc, 'typeOfResourceWrapper')
    unwrapSimpleElement(doc, 'genreWrapper')
    unwrapSimpleElement(doc, 'noteWrapper')

    // Serialize back to string
    return doc.toString()
}
