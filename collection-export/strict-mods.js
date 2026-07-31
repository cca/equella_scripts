import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'

/**
 * Convert VAULT's custom MODS XML to strict MODS schema-compliant XML
 * by unwrapping wrapper elements and removing non-standard elements.
 * http://www.loc.gov/standards/mods/
 */

// XPath contexts for different element types
const XPATH_CONTEXTS = {
    MODS: '//mods',
    ORIGININFO: '//origininfo',
    SUBJECT: '//subject',
}

// Custom EQUELLA wrapper elements to unwrap
const WRAPPER_ELEMENTS = {
    TYPE_OF_RESOURCE: 'typeOfResourceWrapper',
    GENRE: 'genreWrapper',
    NOTE: 'noteWrapper',
    DATE_CREATED: 'dateCreatedWrapper',
}

// Non-standard elements to remove
const CUSTOM_ELEMENTS = {
    DATE_TYPE: 'dateType',
    SUBJECT_TYPE: 'subjectType',
}

// Case-sensitive element names to fix
const CASE_FIXES = {
    ORIGININFO: { old: 'origininfo', new: 'originInfo' },
    RELATEDITEM: { old: 'relateditem', new: 'relatedItem' },
}

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
    if (!doc || !wrapperName) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const wrappers = select(`${context}//${wrapperName}`, doc)

    for (let wrapper of wrappers) {
        const parent = wrapper.parentNode

        if (!parent) {
            continue
        }

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
 * 2. Date range (pointStart AND pointEnd both present) -> create EDTF range date with encoding="edtf"
 * 3. Empty wrapper or incomplete range (only one of pointStart/pointEnd) -> remove entirely
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function unwrapDateCreated(doc) {
    if (!doc) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const wrappers = select('//origininfo/dateCreatedWrapper', doc)

    for (let wrapper of wrappers) {
        const parent = wrapper.parentNode

        if (!parent) {
            continue
        }

        // Get child elements (reuse select from outer scope)
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
        // Case 2: Has a date range (pointStart AND pointEnd both present)
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
        // Case 3: Empty, or only has pointStart OR pointEnd (incomplete range)
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
 * @param {string} [xpathContext='//mods'] - XPath context to search within (searches direct children by default)
 * @returns {Document} Modified document
 */
export function renameElement(doc, oldName, newName, xpathContext = '//mods') {
    if (!doc || !oldName || !newName) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const elements = select(`${xpathContext}/${oldName}`, doc)

    for (let element of elements) {
        if (!element.parentNode) {
            continue
        }

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
 * Recursively remove empty elements (no attributes, no text, no meaningful children)
 * This prevents validation errors from empty required elements and cleans up output
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function removeEmptyElements(doc) {
    if (!doc) {
        return doc
    }

    /**
     * Check if an element is empty (recursively)
     * Empty = no attributes AND no text content AND all children are empty
     */
    function isElementEmpty(element) {
        // Has attributes? Not empty
        if (element.attributes && element.attributes.length > 0) {
            return false
        }

        // Check all child nodes
        for (let node of element.childNodes) {
            if (node.nodeType === 3) { // TEXT_NODE
                if (node.nodeValue.trim()) {
                    return false // Has text content
                }
            } else if (node.nodeType === 1) { // ELEMENT_NODE
                if (!isElementEmpty(node)) {
                    return false // Has non-empty child element
                }
            }
        }

        return true // No attributes, no text, all children empty
    }

    /**
     * Remove empty elements recursively (bottom-up)
     */
    function removeEmpty(element) {
        // Process children first (bottom-up)
        const children = Array.from(element.childNodes).filter(n => n.nodeType === 1)
        for (let child of children) {
            removeEmpty(child)
        }

        // Now check if this element is empty and remove it
        if (isElementEmpty(element) && element.parentNode) {
            element.parentNode.removeChild(element)
        }
    }

    // Start from root
    const select = xpath.useNamespaces({})
    const modsElements = select('//mods', doc)
    for (let mods of modsElements) {
        removeEmpty(mods)
    }

    return doc
}

/**
 * Remove an attribute from elements
 * e.g., remove href from accessCondition
 *
 * @param {Document} doc - XML DOM document
 * @param {string} elementPath - XPath to elements (e.g., '//accessCondition')
 * @param {string} attributeName - Name of attribute to remove
 * @returns {Document} Modified document
 */
export function removeAttribute(doc, elementPath, attributeName) {
    if (!doc || !elementPath || !attributeName) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const elements = select(elementPath, doc)

    for (let element of elements) {
        if (element.hasAttribute(attributeName)) {
            element.removeAttribute(attributeName)
        }
    }

    return doc
}

/**
 * Remove non-MODS elements like dateType and subjectType
 *
 * @param {Document} doc - XML DOM document
 * @param {string} elementName - Name of element to remove
 * @param {string} [context='//mods'] - XPath context to search within
 * @returns {Document} Modified document
 */
export function removeElement(doc, elementName, context = '//mods') {
    if (!doc || !elementName) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const elements = select(`${context}//${elementName}`, doc)

    for (let element of elements) {
        if (element.parentNode) {
            element.parentNode.removeChild(element)
        }
    }

    return doc
}

/**
 * Wrap an element with a parent element
 * e.g., relatedItem/title -> relatedItem/titleInfo/title
 *
 * @param {Document} doc - XML DOM document
 * @param {string} parentPath - XPath to the parent element (e.g., '//relatedItem')
 * @param {string} childElement - Name of child element to wrap (e.g., 'title')
 * @param {string} wrapperElement - Name of wrapper element to create (e.g., 'titleInfo')
 * @returns {Document} Modified document
 */
export function wrapElement(doc, parentPath, childElement, wrapperElement) {
    if (!doc || !parentPath || !childElement || !wrapperElement) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const parents = select(parentPath, doc)

    for (let parent of parents) {
        // Find direct child elements with the specified name
        const children = select(childElement, parent)

        for (let child of children) {
            // Only wrap if it's a direct child
            if (child.parentNode === parent) {
                // Create wrapper element
                const wrapper = doc.createElement(wrapperElement)

                // Insert wrapper before the child
                parent.insertBefore(wrapper, child)

                // Move child into wrapper
                wrapper.appendChild(child)
            }
        }
    }

    return doc
}

/**
 * Wrap text content of an element with a child element and move attributes
 * e.g., <language authority="iso639-2b">eng</language> -> 
 *       <language><languageTerm authority="iso639-2b">eng</languageTerm></language>
 *
 * @param {Document} doc - XML DOM document
 * @param {string} parentPath - XPath to parent elements (e.g., '//language')
 * @param {string} childElement - Name of child element to create (e.g., 'languageTerm')
 * @param {string[]} attributesToMove - Array of attribute names to move to child (e.g., ['authority'])
 * @returns {Document} Modified document
 */
export function wrapTextWithChild(doc, parentPath, childElement, attributesToMove = []) {
    if (!doc || !parentPath || !childElement) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const parents = select(parentPath, doc)

    for (let parent of parents) {
        // Only process if element has direct text content (not already wrapped)
        let hasDirectText = false
        for (let node of parent.childNodes) {
            if (node.nodeType === 3 && node.nodeValue.trim()) { // TEXT_NODE
                hasDirectText = true
                break
            }
        }
        
        if (!hasDirectText) {
            continue
        }

        // Create child element
        const child = doc.createElement(childElement)
        
        // Move text content to child
        while (parent.firstChild) {
            if (parent.firstChild.nodeType === 3) { // TEXT_NODE
                child.appendChild(parent.firstChild)
            } else {
                // If there's already an element child, don't wrap
                break
            }
        }
        
        // Move specified attributes from parent to child
        for (let attrName of attributesToMove) {
            if (parent.hasAttribute(attrName)) {
                child.setAttribute(attrName, parent.getAttribute(attrName))
                parent.removeAttribute(attrName)
            }
        }
        
        // Add child to parent
        parent.appendChild(child)
    }

    return doc
}

/**
 * Convert custom authority-specific topic elements to standard topic with authority attribute
 * e.g., topicCONA -> topic with authority="cona"
 *
 * @param {Document} doc - XML DOM document
 * @param {string} customElement - Name of custom element (e.g., 'topicCONA')
 * @param {string} standardElement - Name of standard element (e.g., 'topic')
 * @param {string} authority - Authority value to add (e.g., 'cona')
 * @returns {Document} Modified document
 */
export function convertAuthorityElement(doc, customElement, standardElement, authority) {
    if (!doc || !customElement || !standardElement || !authority) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const elements = select(`//subject/${customElement}`, doc)

    for (let element of elements) {
        if (!element.parentNode) {
            continue
        }

        const newElement = doc.createElement(standardElement)
        
        // Copy text content
        newElement.textContent = element.textContent
        
        // Add authority attribute
        newElement.setAttribute('authority', authority)
        
        // Copy any existing attributes (except if they conflict)
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i]
            if (attr.name !== 'authority') {
                newElement.setAttribute(attr.name, attr.value)
            }
        }
        
        // Replace old element with new
        element.parentNode.replaceChild(newElement, element)
    }

    return doc
}

/**
 * Move elements from one location to another and optionally rename them
 * e.g., physicalDescription/formBroad -> mods/genre
 *
 * @param {Document} doc - XML DOM document
 * @param {string} sourcePath - XPath to source elements (e.g., '//physicalDescription/formBroad')
 * @param {string} targetParentPath - XPath to target parent (e.g., '//mods')
 * @param {string} newElementName - Name for moved elements (e.g., 'genre')
 * @returns {Document} Modified document
 */
export function moveAndRenameElement(doc, sourcePath, targetParentPath, newElementName) {
    if (!doc || !sourcePath || !targetParentPath || !newElementName) {
        return doc
    }

    const select = xpath.useNamespaces({})
    const sourceElements = select(sourcePath, doc)
    const targetParents = select(targetParentPath, doc)
    
    if (targetParents.length === 0) {
        return doc
    }
    
    const targetParent = targetParents[0]

    for (let sourceElement of sourceElements) {
        // Skip if no text content (empty elements)
        if (!sourceElement.textContent || !sourceElement.textContent.trim()) {
            continue
        }
        
        // Create new element with new name
        const newElement = doc.createElement(newElementName)
        newElement.textContent = sourceElement.textContent
        
        // Copy attributes
        for (let i = 0; i < sourceElement.attributes.length; i++) {
            const attr = sourceElement.attributes[i]
            newElement.setAttribute(attr.name, attr.value)
        }
        
        // Add to target parent
        targetParent.appendChild(newElement)
        
        // Remove source element
        if (sourceElement.parentNode) {
            sourceElement.parentNode.removeChild(sourceElement)
        }
    }

    return doc
}

/**
 * Main conversion function to convert custom MODS to strict MODS
        
        // Add authority attribute
        newElement.setAttribute('authority', authority)
        
        // Copy any existing attributes (except if they conflict)
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i]
            if (attr.name !== 'authority') {
                newElement.setAttribute(attr.name, attr.value)
            }
        }
        
        // Replace old element with new
        element.parentNode.replaceChild(newElement, element)
    }

    return doc
}

/**
 * Main conversion function to convert custom MODS to strict MODS
 *
 * @param {string} xmlString - XML string to convert
 * @returns {string} Converted MODS XML string with namespace, ready for validation
 * @throws {Error} If XML is malformed, cannot be parsed, or input is invalid
 */
export function toStrictMODS(xmlString) {
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

    // Apply simple unwrapping transformations
    unwrapSimpleElement(doc, WRAPPER_ELEMENTS.TYPE_OF_RESOURCE)
    unwrapSimpleElement(doc, WRAPPER_ELEMENTS.GENRE)
    unwrapSimpleElement(doc, WRAPPER_ELEMENTS.NOTE)

    // Handle date wrappers and ranges
    unwrapDateCreated(doc)

    // Remove non-MODS elements
    removeElement(doc, CUSTOM_ELEMENTS.DATE_TYPE, XPATH_CONTEXTS.ORIGININFO)
    removeElement(doc, CUSTOM_ELEMENTS.SUBJECT_TYPE, XPATH_CONTEXTS.SUBJECT)
    removeElement(doc, 'artstorClassification')
    
    // Convert authority-specific topic elements
    convertAuthorityElement(doc, 'topicCONA', 'topic', 'cona')
    
    // Move form elements from physicalDescription to genre
    moveAndRenameElement(doc, '//physicalDescription/formBroad', '//mods', 'genre')
    moveAndRenameElement(doc, '//physicalDescription/formSpecific', '//mods', 'genre')
    
    // Move notes from physicalDescriptionNote wrapper to physicalDescription
    moveAndRenameElement(doc, '//physicalDescriptionNote/note', '//physicalDescription', 'note')

    // Fix case sensitivity
    renameElement(doc, CASE_FIXES.ORIGININFO.old, CASE_FIXES.ORIGININFO.new)
    renameElement(doc, CASE_FIXES.RELATEDITEM.old, CASE_FIXES.RELATEDITEM.new)
    
    // Fix element names for MODS compliance
    renameElement(doc, 'title', 'text', '//part')
    
    // Wrap title elements that are direct children of relatedItem with titleInfo
    wrapElement(doc, '//relatedItem', 'title', 'titleInfo')
    
    // Wrap language text content with languageTerm and move authority attribute
    wrapTextWithChild(doc, '//mods/language', 'languageTerm', ['authority'])
    
    // Remove non-standard attributes
    removeAttribute(doc, '//accessCondition', 'href')
    
    // Remove all empty elements (no attributes, no text, no meaningful children)
    removeEmptyElements(doc)

    // Extract mods element and add namespace (for validation)
    const select = xpath.useNamespaces({})
    const modsElements = select('//mods', doc)
    if (modsElements.length > 0) {
        const modsElement = modsElements[0]

        // Add MODS namespace if not present (required for schema validation)
        if (!modsElement.getAttribute('xmlns')) {
            modsElement.setAttribute('xmlns', 'http://www.loc.gov/mods/v3')
        }

        return modsElement.toString()
    }

    // Fallback: return full document if no mods element found
    return doc.toString()
}

// CLI functionality - run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const fs = await import('fs')
    const path = await import('path')

    const args = process.argv.slice(2)

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.error(`Usage: node strict-mods.js <input-file>

Convert EQUELLA custom MODS XML to strict MODS schema-compliant XML.
Extracts the <mods> element with proper namespace for validation.
`)
        process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1)
    }

    const inputFile = args.find(arg => !arg.startsWith('--'))

    if (!inputFile) {
        console.error('Error: No input file specified')
        process.exit(1)
    }

    try {
        const xmlString = fs.readFileSync(inputFile, 'utf-8')
        const result = toStrictMODS(xmlString)
        console.log(result)
    } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
    }
}
