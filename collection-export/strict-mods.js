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
 * Unwrap dateCreatedWrapper and convert date ranges to EDTF format
 * Handles three cases:
 * 1. Single date with keyDate attribute -> preserve as-is
 * 2. Date range (pointStart/pointEnd) -> create EDTF range date with encoding="edtf"
 * 3. Empty wrapper -> remove entirely
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function unwrapDateCreated(doc) {
    const select = xpath.useNamespaces({})
    const wrappers = select('//origininfo/dateCreatedWrapper', doc)

    for (let wrapper of wrappers) {
        const parent = wrapper.parentNode
        const select = xpath.useNamespaces({})

        // Get child elements
        const dateCreated = select('dateCreated', wrapper)[0]
        const pointStart = select('pointStart', wrapper)[0]
        const pointEnd = select('pointEnd', wrapper)[0]

        // Get values
        const dateValue = dateCreated?.textContent?.trim() || ''
        const startValue = pointStart?.textContent?.trim() || ''
        const endValue = pointEnd?.textContent?.trim() || ''

        // Case 1: Has a single date value (not a range)
        if (dateValue && !startValue && !endValue) {
            // Keep the dateCreated element with its attributes, remove wrapper
            parent.insertBefore(dateCreated, wrapper)
        }
        // Case 2: Has a date range (pointStart and pointEnd)
        else if (startValue && endValue) {
            // Create new dateCreated element with EDTF range
            const newDate = doc.createElement('dateCreated')
            newDate.textContent = `${startValue}/${endValue}`
            newDate.setAttribute('encoding', 'edtf')

            // Copy keyDate attribute if present
            if (dateCreated?.hasAttribute('keyDate')) {
                newDate.setAttribute('keyDate', dateCreated.getAttribute('keyDate'))
            }

            parent.insertBefore(newDate, wrapper)
        }
        // Case 3: Empty or only has pointStart OR pointEnd (incomplete range)
        // Just remove the wrapper without creating a new element

        // Remove the wrapper
        parent.removeChild(wrapper)
    }

    return doc
}

/**
 * Helper function to rename elements while preserving attributes and children
 * 
 * @param {Document} doc - XML DOM document
 * @param {string} oldName - Current element name
 * @param {string} newName - New element name
 * @param {string} [xpath='//mods'] - XPath context to search within
 * @returns {Document} Modified document
 */
export function renameElement(doc, oldName, newName, xpathContext = '//mods') {
    const select = xpath.useNamespaces({})
    const elements = select(`${xpathContext}/${oldName}`, doc)

    for (let element of elements) {
        const newElement = doc.createElement(newName)

        // Copy all attributes
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i]
            newElement.setAttribute(attr.name, attr.value)
        }

        // Move all children
        while (element.firstChild) {
            newElement.appendChild(element.firstChild)
        }

        // Replace in parent
        element.parentNode.replaceChild(newElement, element)
    }

    return doc
}

/**
 * Remove non-MODS elements like dateType
 *
 * @param {Document} doc - XML DOM document
 * @param {string} elementName - Name of element to remove
 * @param {string} [context='//mods'] - XPath context to search within
 * @returns {Document} Modified document
 */
export function removeElement(doc, elementName, context = '//mods') {
    const select = xpath.useNamespaces({})
    const elements = select(`${context}//${elementName}`, doc)

    for (let element of elements) {
        element.parentNode.removeChild(element)
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

    // Handle date wrappers and ranges
    unwrapDateCreated(doc)
    
    // Remove non-MODS elements
    removeElement(doc, 'dateType', '//origininfo')
    removeElement(doc, 'subjectType', '//subject')
    
    // Fix case sensitivity
    renameElement(doc, 'origininfo', 'originInfo')
    renameElement(doc, 'relateditem', 'relatedItem')

    // Serialize back to string
    return doc.toString()
}
