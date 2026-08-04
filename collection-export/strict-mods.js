import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
    safeSelect,
    copyAttributes,
    moveChildren,
    isEmptyOrWhitespace,
    moveAndTransformElement,
    createElement,
    isElementEmpty
} from './strict-mods-helpers.js'

/**
 * Convert VAULT's custom MODS XML to strict MODS schema-compliant XML
 * by unwrapping wrapper elements and removing non-standard elements.
 * http://www.loc.gov/standards/mods/
 */

// XPath contexts for different element types
const XPATH_CONTEXTS = {
    ACCESS_CONDITION: '//accessCondition',
    LANGUAGE: '//mods/language',
    MODS: '//mods',
    NAME: '//name',
    ORIGININFO_CAMEL: '//originInfo',
    ORIGININFO: '//origininfo',
    ORIGININFO_PLACE: '//originInfo/place',
    PART: '//part',
    PHYSICAL_DESCRIPTION: '//physicalDescription',
    RECORD_INFO: '//recordInfo',
    RELATEDITEM: '//relatedItem',
    SUBJECT: '//subject',
    SUBJECT_NAME: '//subject/name',
}

// Custom EQUELLA wrapper elements to unwrap
const WRAPPER_ELEMENTS = {
    DATE_CREATED: 'dateCreatedWrapper',
    DATE_OTHER: 'dateOtherWrapper',
    GENRE: 'genreWrapper',
    NOTE: 'noteWrapper',
    PHYSICAL_DESCRIPTION_NOTE: 'physicalDescriptionNote',
    TYPE_OF_RESOURCE: 'typeOfResourceWrapper',
}

// Non-standard elements to remove
const CUSTOM_ELEMENTS = {
    ARTSTOR_CLASSIFICATION: 'artstorClassification',
    DATE_TYPE: 'dateType',
    // numberB, numberC, numberD are used in Faculty Research collection to store
    // redundant bibliographic information (page ranges, volume, issue) that is
    // already present in valid MODS fields within relatedItem/part
    NUMBER_B: 'numberB',
    NUMBER_C: 'numberC',
    NUMBER_D: 'numberD',
    PHOTO_CLASSIFICATION: 'photoClassification',
    SUBJECT_TYPE: 'subjectType',
}

// Case-sensitive element names to fix
const CASE_FIXES = {
    ORIGININFO: { old: 'origininfo', new: 'originInfo' },
    RELATEDITEM: { old: 'relateditem', new: 'relatedItem' },
}

// Element names for transformations
const ELEMENT_NAMES = {
    GENRE: 'genre',
    LANGUAGE_OF_CATALOGING: 'languageOfCataloging',
    LANGUAGE_TERM: 'languageTerm',
    NAME_PART: 'namePart',
    NOTE: 'note',
    PLACE_TERM: 'placeTerm',
    SUBJECT: 'subject',
    TEXT: 'text',
    TITLE_INFO: 'titleInfo',
    TOPIC: 'topic',
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
export function unwrapSimpleElement(doc, wrapperName, context = XPATH_CONTEXTS.MODS) {
    if (!doc || !wrapperName) {
        return doc
    }

    const wrappers = safeSelect(`${context}//${wrapperName}`, doc)

    for (let wrapper of wrappers) {
        const parent = wrapper.parentNode
        // Move all children to parent, inserting before the wrapper to preserve order
        while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, wrapper)
        }
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

    const wrappers = safeSelect(`${XPATH_CONTEXTS.ORIGININFO}/${WRAPPER_ELEMENTS.DATE_CREATED}`, doc)

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
        // Case 2: Has a date range (pointStart AND pointEnd both present)
        else if (startValue && endValue) {
            // Create new dateCreated element with EDTF range
            const attributes = { encoding: 'edtf' }
            if (dateCreated?.hasAttribute('keyDate')) {
                attributes.keyDate = dateCreated.getAttribute('keyDate')
            }
            const newDate = createElement(doc, 'dateCreated', `${startValue}/${endValue}`, attributes)
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
 * Unwrap dateOtherWrapper and convert date ranges to EDTF format
 * Handles three cases:
 * 1. Single date with encoding/type attributes -> preserve as-is
 * 2. Date range (pointStart AND pointEnd both present) -> create EDTF range date with encoding="edtf" and preserve type attribute
 * 3. Empty wrapper or incomplete range (only one of pointStart/pointEnd) -> remove entirely
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function unwrapDateOther(doc) {
    if (!doc) {
        return doc
    }

    const wrappers = safeSelect(`${XPATH_CONTEXTS.ORIGININFO}/${WRAPPER_ELEMENTS.DATE_OTHER}`, doc)

    for (let wrapper of wrappers) {
        const parent = wrapper.parentNode
        const select = xpath.useNamespaces({})

        // Get child elements
        const dateOther = select('dateOther', wrapper)[0]
        const pointStart = select('pointStart', wrapper)[0]
        const pointEnd = select('pointEnd', wrapper)[0]

        // Get values
        const dateValue = dateOther?.textContent?.trim() || ''
        const startValue = pointStart?.textContent?.trim() || ''
        const endValue = pointEnd?.textContent?.trim() || ''

        // Case 1: Has a single date value (not a range)
        if (dateValue && !startValue && !endValue) {
            // Keep the dateOther element with its attributes, remove wrapper
            parent.insertBefore(dateOther, wrapper)
        }
        // Case 2: Has a date range (pointStart AND pointEnd both present)
        else if (startValue && endValue) {
            // Create new dateOther element with EDTF range
            const attributes = { encoding: 'edtf' }
            // Preserve type attribute from original dateOther
            if (dateOther?.hasAttribute('type')) {
                attributes.type = dateOther.getAttribute('type')
            }
            const newDate = createElement(doc, 'dateOther', `${startValue}/${endValue}`, attributes)
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
 * Optionally adds new attributes to the renamed elements
 *
 * @param {Document} doc - XML DOM document
 * @param {string} oldName - Current element name
 * @param {string} newName - New element name
 * @param {string} [xpathContext='//mods'] - XPath context to search within (searches direct children by default)
 * @param {Object} [attributes={}] - Optional map of attribute names to values to add to renamed elements
 *                                    e.g., { type: 'attachment-uuid', encoding: 'utf-8' }
 * @returns {Document} Modified document
 */
export function renameElement(doc, oldName, newName, xpathContext = XPATH_CONTEXTS.MODS, attributes = {}) {
    if (!doc || !oldName || !newName) {
        return doc
    }

    const elements = safeSelect(`${xpathContext}/${oldName}`, doc)

    for (let element of elements) {
        const newElement = doc.createElement(newName)
        copyAttributes(element, newElement)

        // Add new attributes if specified
        if (attributes && typeof attributes === 'object') {
            Object.entries(attributes).forEach(([name, value]) => {
                newElement.setAttribute(name, value)
            })
        }

        moveChildren(element, newElement)
        element.parentNode.replaceChild(newElement, element)
    }

    return doc
}

/**
 * Recursively remove empty elements (no text, no children with text)
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
    const modsElements = safeSelect(XPATH_CONTEXTS.MODS, doc)
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

    const elements = safeSelect(elementPath, doc)

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
export function removeElement(doc, elementName, context = XPATH_CONTEXTS.MODS) {
    if (!doc || !elementName) {
        return doc
    }

    const elements = safeSelect(`${context}//${elementName}`, doc)

    for (let element of elements) {
        element.parentNode.removeChild(element)
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

    const parents = safeSelect(parentPath, doc)
    const select = xpath.useNamespaces({})

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

    const parents = safeSelect(parentPath, doc)

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

    const elements = safeSelect(`${XPATH_CONTEXTS.SUBJECT}/${customElement}`, doc)

    for (let element of elements) {
        const newElement = createElement(doc, standardElement, element.textContent, { authority })
        copyAttributes(element, newElement, ['authority']) // Skip authority since we're setting it
        element.parentNode.replaceChild(newElement, element)
    }

    return doc
}

/**
 * Move classification elements to subject/topic with authority attribute
 * e.g., mods/photoClassification -> mods/subject/topic with authority="local"
 *
 * @param {Document} doc - XML DOM document
 * @param {string} classificationElement - Name of classification element (e.g., 'photoClassification')
 * @param {string} authority - Authority value to add (e.g., 'local')
 * @returns {Document} Modified document
 */
export function moveClassificationToSubject(doc, classificationElement, authority) {
    if (!doc || !classificationElement || !authority) {
        return doc
    }

    return moveAndTransformElement(
        doc,
        `${XPATH_CONTEXTS.MODS}/${classificationElement}`,
        XPATH_CONTEXTS.MODS,
        ELEMENT_NAMES.TOPIC,
        {
            wrapperElement: ELEMENT_NAMES.SUBJECT,
            addAttributes: { authority },
            skipEmpty: true
        }
    )
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

    return moveAndTransformElement(doc, sourcePath, targetParentPath, newElementName, { skipEmpty: true })
}

/**
 * Convert namePartDate elements to namePart elements with type="date" attribute
 * namePartDate is a custom EQUELLA element that should be namePart with type="date"
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function convertNamePartDate(doc) {
    if (!doc) {
        return doc
    }

    const namePartDates = safeSelect(`${XPATH_CONTEXTS.NAME}/namePartDate`, doc)

    for (let element of namePartDates) {
        const newElement = doc.createElement('namePart')
        newElement.setAttribute('type', 'date')

        // Copy attributes from original element
        copyAttributes(element, newElement)

        // Move children (text nodes and elements)
        moveChildren(element, newElement)

        // Replace the old element with the new one
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
    unwrapDateOther(doc)

    // Remove non-MODS elements
    removeElement(doc, CUSTOM_ELEMENTS.DATE_TYPE, XPATH_CONTEXTS.ORIGININFO)
    removeElement(doc, CUSTOM_ELEMENTS.SUBJECT_TYPE, XPATH_CONTEXTS.SUBJECT)
    removeElement(doc, CUSTOM_ELEMENTS.ARTSTOR_CLASSIFICATION)
    // Remove redundant bibliographic fields from part (used in Faculty Research collection)
    removeElement(doc, CUSTOM_ELEMENTS.NUMBER_B, XPATH_CONTEXTS.PART)
    removeElement(doc, CUSTOM_ELEMENTS.NUMBER_C, XPATH_CONTEXTS.PART)
    removeElement(doc, CUSTOM_ELEMENTS.NUMBER_D, XPATH_CONTEXTS.PART)

    // Convert authority-specific topic elements
    convertAuthorityElement(doc, 'topicCONA', ELEMENT_NAMES.TOPIC, 'cona')

    // Move form elements from physicalDescription to genre
    moveAndRenameElement(doc, `${XPATH_CONTEXTS.PHYSICAL_DESCRIPTION}/formBroad`, XPATH_CONTEXTS.MODS, ELEMENT_NAMES.GENRE)
    moveAndRenameElement(doc, `${XPATH_CONTEXTS.PHYSICAL_DESCRIPTION}/formSpecific`, XPATH_CONTEXTS.MODS, ELEMENT_NAMES.GENRE)

    // Move notes from physicalDescriptionNote wrapper to physicalDescription
    moveAndRenameElement(doc, `//${WRAPPER_ELEMENTS.PHYSICAL_DESCRIPTION_NOTE}/${ELEMENT_NAMES.NOTE}`, XPATH_CONTEXTS.PHYSICAL_DESCRIPTION, ELEMENT_NAMES.NOTE)

    // Fix case sensitivity
    renameElement(doc, CASE_FIXES.ORIGININFO.old, CASE_FIXES.ORIGININFO.new)
    renameElement(doc, CASE_FIXES.RELATEDITEM.old, CASE_FIXES.RELATEDITEM.new)

    // Fix element names for MODS compliance
    // part/title -> part/text
    renameElement(doc, 'title', ELEMENT_NAMES.TEXT, XPATH_CONTEXTS.PART)
    // part/number contains attachment UUIDs, map to part/text with type="attachment-uuid"
    renameElement(doc, 'number', ELEMENT_NAMES.TEXT, XPATH_CONTEXTS.PART, { type: 'attachment-uuid' })

    // Convert namePartDate to namePart with type="date" attribute
    convertNamePartDate(doc)

    // Wrap title elements that are direct children of relatedItem with titleInfo
    wrapElement(doc, XPATH_CONTEXTS.RELATEDITEM, 'title', ELEMENT_NAMES.TITLE_INFO)

    // Wrap language text content with languageTerm and move authority attribute
    wrapTextWithChild(doc, XPATH_CONTEXTS.LANGUAGE, ELEMENT_NAMES.LANGUAGE_TERM, ['authority'])

    // Wrap originInfo/place text content with placeTerm
    wrapTextWithChild(doc, XPATH_CONTEXTS.ORIGININFO_PLACE, ELEMENT_NAMES.PLACE_TERM, [])

    // Wrap subject/name text content with namePart (preserves authority and type attributes on name)
    wrapTextWithChild(doc, XPATH_CONTEXTS.SUBJECT_NAME, ELEMENT_NAMES.NAME_PART, [])

    // Move classification elements to subject/topic
    moveClassificationToSubject(doc, CUSTOM_ELEMENTS.PHOTO_CLASSIFICATION, 'local')
    removeElement(doc, CUSTOM_ELEMENTS.PHOTO_CLASSIFICATION)  // Remove any remaining classification elements

    // Remove non-standard attributes
    removeAttribute(doc, XPATH_CONTEXTS.ACCESS_CONDITION, 'href')

    // Wrap recordInfo/languageOfCataloging with languageTerm and move authority attribute
    wrapTextWithChild(doc, `${XPATH_CONTEXTS.RECORD_INFO}/languageOfCataloging`, ELEMENT_NAMES.LANGUAGE_TERM, ['authority'])

    // Remove all empty elements (no text, no children with text)
    removeEmptyElements(doc)

    // Extract mods element and add namespace (for validation)
    const modsElements = safeSelect(XPATH_CONTEXTS.MODS, doc)
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
        const helpText = `Usage: node strict-mods.js <input-file>

Convert EQUELLA custom MODS XML to strict MODS schema-compliant XML.
Extracts the <mods> element with proper namespace for validation.
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
        const result = toStrictMODS(xmlString)
        console.log(result)
    } catch (error) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
    }
}
