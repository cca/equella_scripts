import xpath from 'xpath'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import {
    safeSelect,
    copyAttributes,
    moveChildren,
    isEmptyOrWhitespace,
    moveAndTransformElement,
    createElement,
    isElementEmpty,
    hasDirectTextContent
} from './strict-mods-helpers.js'

/**
 * Convert VAULT's custom MODS XML to strict MODS schema-compliant XML
 * by unwrapping wrapper elements and removing non-standard elements.
 * http://www.loc.gov/standards/mods/
 */

// XPath contexts for different element types
const XPATH_CONTEXTS = {
    ACCESS_CONDITION: '//accessCondition',
    COPY_INFORMATION: '//copyInformation',
    LANGUAGE: '//mods/language',
    MODS: '//mods',
    NAME: '//name',
    ORIGININFO_CAMEL: '//originInfo',
    ORIGININFO: '//origininfo',
    ORIGININFO_PLACE: '//originInfo/place',
    PART: '//part',
    PHYSICAL_DESCRIPTION: '//physicalDescription',
    PHYSICAL_DESCRIPTION_NOTE: '//physicalDescriptionNote',
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
    SUB_NAME: 'subNameWrapper',
    TYPE_OF_RESOURCE: 'typeOfResourceWrapper',
}

// Non-standard elements to remove
const CUSTOM_ELEMENTS = {
    ARTSTOR_CLASSIFICATION: 'artstorClassification',
    DATE_TYPE: 'dateType',
    FORM_BROAD: 'formBroad',
    FORM_SPECIFIC: 'formSpecific',
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
    RELATEDITEM: {old: 'relateditem', new: 'relatedItem'},
    SUBLOCATION: {old: 'sublocation', new: 'subLocation'},
}

// Element names for transformations
const ELEMENT_NAMES = {
    EXTENT: 'extent',
    GENRE: 'genre',
    LANGUAGE_OF_CATALOGING: 'languageOfCataloging',
    LANGUAGE_TERM: 'languageTerm',
    LIST: 'list',
    LOCATION: 'location',
    NAME_PART: 'namePart',
    NOTE: 'note',
    NUMBER: 'number',
    PHYSICAL_LOCATION: 'physicalLocation',
    PLACE_TERM: 'placeTerm',
    SUBJECT: 'subject',
    TEXT: 'text',
    TITLE_INFO: 'titleInfo',
    TITLE: 'title',
    TOPIC: 'topic',
    URL: 'url',
}

// Attributes
const ATTRIBUTES = {
    AUTHORITY: 'authority',
    HREF: 'href',
    XMLNS: 'xmlns',
}

// https://www.loc.gov/standards/mods/userguide/attributes.html
const DATE_CREATED_QUALIFIER_VALUES = ['approximate', 'inferred', 'questionable']
const DATE_CREATED_KEYDATE_VALUES = ['yes']
const TITLE_INFO_TYPES = ['uniform', 'alternative', 'translated', 'abbreviated']
const TITLE_INFO_USAGE_VALUES = ['primary']

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
 * We have a nonstandard @usage attribute on the titleInfo/title element
 * which should be titleInfo/@type instead with one of four values: uniform, alternative,
 * translated, or abbreviated. "Primary" is not valid & should be dropped.
 * We also move nonstandard values to titleInfo/@otherType instead of titleInfo/@type.
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function fixTitleAttributes(doc) {
    if (!doc) {
        return doc
    }
    const title = safeSelect(`${XPATH_CONTEXTS.MODS}//titleInfo/title`, doc)

    for (let titleElement of title) {
        const titleUsageValue = titleElement.getAttribute('usage')
        const titleInfoElement = titleElement.parentNode
        const titleInfoTypeValue = titleInfoElement.getAttribute('type')
        const titleInfoUsageValue = titleInfoElement.getAttribute('usage')

        // If title info type is empty string, remove it
        if (titleInfoTypeValue === '') {
            titleInfoElement.removeAttribute('type')
        }

        // If title usage value is one of the valid types
        // and we do not already have a valid titleInfo/@type
        // move it to titleInfo/@type
        // otherwise put it in the uncontrolled @otherType
        if (titleUsageValue) {
            if (TITLE_INFO_TYPES.includes(titleUsageValue) && !titleInfoTypeValue) {
                titleInfoElement.setAttribute('type', titleUsageValue)
            } else {
                titleInfoElement.setAttribute('otherType', titleUsageValue)
            }

            // Remove the nonstandard @usage attribute from title
            titleElement.removeAttribute('usage')
        }

        // If titleInfo/@type is invalid and we do not already have an @otherType, move it to @otherType
        // This implies we prefer titleInfo/title@usage over titleInfo@type
        if (titleInfoTypeValue && !TITLE_INFO_TYPES.includes(titleInfoTypeValue)) {
            if (!titleInfoElement.hasAttribute('otherType')) {
                titleInfoElement.setAttribute('otherType', titleInfoTypeValue)
            }
            titleInfoElement.removeAttribute('type')
        }

        // If titleInfo/@usage is invalid
        // and we already have an otherType, remove it
        // else move it to @otherType
        if (titleInfoUsageValue && !TITLE_INFO_USAGE_VALUES.includes(titleInfoUsageValue)) {
            if (!titleInfoElement.hasAttribute('otherType')) {
                titleInfoElement.setAttribute('otherType', titleInfoUsageValue)
            }
            titleInfoElement.removeAttribute('usage')
        }
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
        if (!hasDirectTextContent(parent)) {
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
 * dateCreated@keyDate can only be "yes" and we have "no" values,
 * which is implied. Remove them.
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function fixDateCreatedKeyDate(doc) {
    if (!doc) {
        return doc
    }

    const dateCreatedElements = safeSelect(`${XPATH_CONTEXTS.ORIGININFO}/dateCreated`, doc)
    for (let dateCreated of dateCreatedElements) {
        const keyDateValue = dateCreated.getAttribute('keyDate')
        if (!DATE_CREATED_KEYDATE_VALUES.includes(keyDateValue)) {
            dateCreated.removeAttribute('keyDate')
        }
    }

    return doc
}


/**
 * Ensure dateCreated/@qualifier has a valid value, we have
 * empty strings in our data.
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function fixDateCreatedQualifer(doc) {
    if (!doc) {
        return doc
    }

    const dateCreatedElements = safeSelect(`${XPATH_CONTEXTS.ORIGININFO}/dateCreated`, doc)
    for (let dateCreated of dateCreatedElements) {
        const qualifierValue = dateCreated.getAttribute('qualifier')
        if (!DATE_CREATED_QUALIFIER_VALUES.includes(qualifierValue)) {
            dateCreated.removeAttribute('qualifier')
        }
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
            addAttributes: { authority: "ccac" },
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
 * Remove usage attributes from name elements if they're not "primary".
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function removeBadNameUsageAttrs(doc) {
    if (!doc) {
        return doc
    }
    const VALID_USAGE_VALUES = ['primary']

    const nameElements = safeSelect(`${XPATH_CONTEXTS.NAME}[@usage]`, doc)
    for (let name of nameElements) {
        const usageValue = name.getAttribute('usage')
        if (!VALID_USAGE_VALUES.includes(usageValue)) {
            name.removeAttribute('usage')
        }
    }

    return doc
}

/**
 * Convert part/detail elements that indicate speaker release forms
 * Convert part/number elements to part/text with type="attachment-uuid"
 * 
 * When a part has multiple numbers (UUIDs), we cannot safely associate them with
 * the part/title filename without access to the full item attachments JSON.
 * 
 * Strategy:
 * - If part has 1 number: convert to text@type="attachment-uuid" in same part with title
 * - If part has >1 number: keep title in original part, create ONE separate part with all UUIDs
 * 
 * This preserves all data without making unsafe assumptions about UUID-to-filename mapping.
 * 
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function convertPartNumbers(doc) {
    if (!doc) {
        return doc
    }

    const parts = safeSelect(XPATH_CONTEXTS.PART, doc)
    const select = xpath.useNamespaces({})

    for (let part of parts) {
        const numbers = select('number', part)
        
        if (numbers.length === 0) {
            continue
        }

        if (numbers.length === 1) {
            // Safe case: single UUID, convert in place
            const number = numbers[0]
            const text = doc.createElement('text')
            text.setAttribute('type', 'attachment-uuid')
            text.textContent = number.textContent
            part.replaceChild(text, number)
        } else {
            // Multiple UUIDs: cannot safely associate with filename
            // Keep title in original part, create separate part for UUIDs
            const modsElement = part.parentNode
            const uuidPart = doc.createElement('part')
            
            // Move all numbers to the new UUID part
            const numberList = [...numbers] // Copy array since we're modifying DOM
            for (let number of numberList) {
                const text = doc.createElement('text')
                text.setAttribute('type', 'attachment-uuid')
                text.textContent = number.textContent
                uuidPart.appendChild(text)
                part.removeChild(number)
            }
            
            // Insert UUID part after current part
            if (part.nextSibling) {
                modsElement.insertBefore(uuidPart, part.nextSibling)
            } else {
                modsElement.appendChild(uuidPart)
            }
        }
    }

    return doc
}

/**
 * Mudflats collection uses part/detail with "yes"/"no" values to indicate
 * whether a speaker release form exists for oral history attachments.
 * - detail with "no" -> remove the element
 * - detail with "yes" -> replace with part/text containing "Speaker Release Form"
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function convertSpeakerReleaseDetail(doc) {
    if (!doc) {
        return doc
    }

    // Find all detail elements under part
    const detailElements = safeSelect('//part/detail', doc)

    for (let detail of detailElements) {
        const value = detail.textContent.trim().toLowerCase()
        const part = detail.parentNode

        if (value === 'no') {
            // Remove detail elements with "no"
            part.removeChild(detail)
        } else if (value === 'yes') {
            // Replace with part/text containing "Speaker Release Form"
            const textElement = doc.createElement('text')
            textElement.textContent = 'Speaker Release Form'
            part.replaceChild(textElement, detail)
        }
        // Ignore any other values (shouldn't exist but be defensive)
    }

    return doc
}

/**
 * Wrap copyInformation in holdingSimple element
 * MODS standard requires: location/holdingSimple/copyInformation
 * Currently we have: location/copyInformation (non-standard)
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function wrapCopyInformation(doc) {
    if (!doc) {
        return doc
    }

    // Find all copyInformation elements that are direct children of location
    const copyInfoElements = safeSelect('//location/copyInformation', doc)

    for (let copyInfo of copyInfoElements) {
        const location = copyInfo.parentNode

        // Create holdingSimple wrapper
        const holdingSimple = doc.createElement('holdingSimple')

        // Move copyInformation into holdingSimple
        location.removeChild(copyInfo)
        holdingSimple.appendChild(copyInfo)

        // Add holdingSimple to location
        location.appendChild(holdingSimple)
    }

    return doc
}

/**
 * Reorder children of copyInformation to match MODS schema sequence
 * Schema order: form, subLocation, shelfLocator, electronicLocator, note, enumerationAndChronology, itemIdentifier
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function reorderCopyInformationChildren(doc) {
    if (!doc) {
        return doc
    }

    const copyInfoElements = safeSelect('//copyInformation', doc)
    const correctOrder = ['form', 'subLocation', 'shelfLocator', 'electronicLocator', 'note', 'enumerationAndChronology', 'itemIdentifier']

    for (let copyInfo of copyInfoElements) {
        // Get all children
        const children = Array.from(copyInfo.childNodes).filter(node => node.nodeType === 1) // Element nodes only

        // Sort children by the schema order
        children.sort((a, b) => {
            const aIndex = correctOrder.indexOf(a.tagName)
            const bIndex = correctOrder.indexOf(b.tagName)
            // Elements not in the list go to the end
            const aPos = aIndex === -1 ? 1000 : aIndex
            const bPos = bIndex === -1 ? 1000 : bIndex
            return aPos - bPos
        })

        // Remove all children
        while (copyInfo.firstChild) {
            copyInfo.removeChild(copyInfo.firstChild)
        }

        // Re-append in correct order
        for (let child of children) {
            copyInfo.appendChild(child)
        }
    }

    return doc
}

/**
 * Wrap location text content with appropriate child elements
 * - URLs go into <url> elements
 * - Physical locations go into <physicalLocation> elements
 * Uses Node's URL constructor to validate URLs
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function wrapLocationTextContent(doc) {
    if (!doc) {
        return doc
    }

    // Find all location elements that might have direct text content
    const locationElements = safeSelect('//location', doc)

    for (let location of locationElements) {
        // Only process if element has direct text content (not already wrapped)
        if (!hasDirectTextContent(location)) {
            continue
        }

        // Get the text content for URL detection
        let textContent = ''
        for (let node of location.childNodes) {
            if (node.nodeType === 3) { // TEXT_NODE
                const text = node.nodeValue.trim()
                if (text) {
                    textContent = text
                    break
                }
            }
        }

        // Determine if text is a URL or physical location
        let isURL
        try {
            // Use Node's URL constructor to validate URL
            // This handles various URL formats including http, https, ftp, etc.
            new URL(textContent)
            isURL = true
        } catch {
            // Not a valid URL, treat as physical location
            isURL = false
        }

        // Create appropriate child element
        const childElementName = isURL ? ELEMENT_NAMES.URL : ELEMENT_NAMES.PHYSICAL_LOCATION
        const child = doc.createElement(childElementName)

        // Move text content to child element
        while (location.firstChild) {
            if (location.firstChild.nodeType === 3) { // TEXT_NODE
                child.appendChild(location.firstChild)
            } else {
                // If there's already an element child, don't process this location
                // (it means the text is mixed with elements, which shouldn't happen)
                break
            }
        }

        // Only add the child if it has content
        if (child.textContent.trim()) {
            location.appendChild(child)
        }
    }

    return doc
}

/**
 * Remove classification elements that only contain classificationType children.
 * classificationType is a non-standard element with values "CCA/C Subject" or
 * "ARTstor" in Libraries collection but is disconnected from the element where
 * those _subject_ (and not classification) terms are stored.
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function removeEmptyClassifications(doc) {
    if (!doc) {
        return doc
    }

    const classifications = safeSelect('//classification', doc)

    for (let classification of classifications) {
        // Check if classification has direct text content (meaningful content)
        if (!hasDirectTextContent(classification)) {
            const classificationTypes = Array.from(classification.childNodes).filter(
                node => node.nodeType === 1 && node.tagName === 'classificationType'
            )

            // If classification only contains classificationType (no actual classification value),
            // remove the entire classification element
            if (classificationTypes.length > 0) {
                classification.parentNode.removeChild(classification)
            }
        }
    }

    return doc
}

/**
 * Convert local/archivesWrapper (series/subseries) to nested relatedItem elements
 * Maps archives metadata to MODS relatedItem structure:
 * - subseries -> relatedItem type="series" displayLabel="subseries" containing
 * - series -> nested relatedItem type="series" displayLabel="series"
 * If only series exists, creates single relatedItem with displayLabel="series"
 * 
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function convertArchivesWrapper(doc) {
    if (!doc) {
        return doc
    }

    const archivesWrappers = safeSelect('//local/archivesWrapper', doc)
    const select = xpath.useNamespaces({})

    for (let wrapper of archivesWrappers) {
        const local = wrapper.parentNode // archivesWrapper's parent is local
        
        // Find the mods element - local is a sibling of mods, not a child
        // Navigate to parent (xml) then find mods child
        const modsElements = safeSelect('//mods', doc)
        if (modsElements.length === 0) {
            continue
        }
        const mods = modsElements[0]
        
        // Get series and subseries BEFORE removing wrapper
        const seriesEl = select('series', wrapper)[0]
        const subseriesEl = select('subseries', wrapper)[0]
        
        const seriesText = seriesEl?.textContent?.trim() || ''
        const subseriesText = subseriesEl?.textContent?.trim() || ''
        
        // Remove the archivesWrapper from local
        local.removeChild(wrapper)
        
        // Skip if both are empty
        if (!seriesText && !subseriesText) {
            continue
        }
        
        if (subseriesText && seriesText) {
            // Both exist: create nested structure
            // Outer relatedItem is subseries
            const outerRelatedItem = doc.createElement('relatedItem')
            outerRelatedItem.setAttribute('type', 'series')
            outerRelatedItem.setAttribute('displayLabel', 'subseries')
            
            const outerTitleInfo = doc.createElement('titleInfo')
            const outerTitle = doc.createElement('title')
            outerTitle.textContent = subseriesText
            outerTitleInfo.appendChild(outerTitle)
            outerRelatedItem.appendChild(outerTitleInfo)
            
            // Inner relatedItem is series
            const innerRelatedItem = doc.createElement('relatedItem')
            innerRelatedItem.setAttribute('type', 'series')
            innerRelatedItem.setAttribute('displayLabel', 'series')
            
            const innerTitleInfo = doc.createElement('titleInfo')
            const innerTitle = doc.createElement('title')
            innerTitle.textContent = seriesText
            innerTitleInfo.appendChild(innerTitle)
            innerRelatedItem.appendChild(innerTitleInfo)
            
            outerRelatedItem.appendChild(innerRelatedItem)
            mods.appendChild(outerRelatedItem)
            
        } else if (seriesText) {
            // Only series: create single relatedItem
            const relatedItem = doc.createElement('relatedItem')
            relatedItem.setAttribute('type', 'series')
            relatedItem.setAttribute('displayLabel', 'series')
            
            const titleInfo = doc.createElement('titleInfo')
            const title = doc.createElement('title')
            title.textContent = seriesText
            titleInfo.appendChild(title)
            relatedItem.appendChild(titleInfo)
            
            mods.appendChild(relatedItem)
        }
        // Note: subseries without series shouldn't happen based on data analysis
    }

    // Remove empty local elements (if all archivesWrappers were removed)
    const localElements = safeSelect('//local[not(*)]', doc)
    for (let local of localElements) {
        local.parentNode.removeChild(local)
    }

    return doc
}

/**
 * Fix nonstandard mods/name/subNameWrapper elements, several operations:
 * - affiliation -> name/affiliation ("CCAC")
 * - constituent -> append to affiliation affiliation ("CCAC Faculty")
 * - department -> name/affiliation ("MFA Design")
 * - gradDate -> append to department affiliation ("MFA Design 2020")
 * - description -> name/description ("Sinel was the father of modern industrial design.")
 *
 * @param {Document} doc - XML DOM document
 * @returns {Document} Modified document
 */
export function convertSubNameWrapper(doc) {
    if (!doc) {
        return doc
    }

    const subNameWrappers = safeSelect(`${XPATH_CONTEXTS.NAME}/${WRAPPER_ELEMENTS.SUB_NAME}`, doc)

    for (let wrapper of subNameWrappers) {
        const parentName = wrapper.parentNode
        const select = xpath.useNamespaces({})

        // affiliation
        const affiliation = select('affiliation', wrapper)[0]
        if (affiliation && affiliation.textContent.trim()) {
            parentName.appendChild(affiliation)
        }

        // constituent -> append to affiliation
        const constituent = select('constituent', wrapper)[0]
        if (constituent && affiliation && constituent.textContent.trim()) {
            affiliation.textContent += ` ${constituent.textContent.trim()}`
        }

        // department -> name/affiliation
        const department = select('department', wrapper)[0]
        if (department && department.textContent.trim()) {
            const deptAffiliation = doc.createElement('affiliation')
            deptAffiliation.textContent = department.textContent.trim()
            parentName.appendChild(deptAffiliation)
        }

        // gradDate -> append to department affiliation
        const gradDate = select('gradDate', wrapper)[0]
        if (gradDate && department && gradDate.textContent.trim()) {
            const deptAffiliation = select('affiliation', parentName).find(el => el.textContent.includes(department.textContent.trim()))
            if (deptAffiliation) {
                deptAffiliation.textContent += ` ${gradDate.textContent.trim()}`
            }
        }

        // description -> name/description
        const description = select('description', wrapper)[0]
        if (description && description.textContent.trim()) {
            parentName.appendChild(description)
        }

        // Remove subNameWrapper after processing
        parentName.removeChild(wrapper)
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

    // Fix titleInfo/title usage attribute
    fixTitleAttributes(doc)

    // Handle date wrappers and ranges
    unwrapDateCreated(doc)
    unwrapDateOther(doc)
    // fix invalid dateCreated attributes
    fixDateCreatedKeyDate(doc)
    fixDateCreatedQualifer(doc)

    // Remove non-MODS elements
    removeElement(doc, CUSTOM_ELEMENTS.DATE_TYPE, XPATH_CONTEXTS.ORIGININFO)
    removeElement(doc, CUSTOM_ELEMENTS.SUBJECT_TYPE, XPATH_CONTEXTS.SUBJECT)
    removeElement(doc, CUSTOM_ELEMENTS.ARTSTOR_CLASSIFICATION)
    // Remove redundant bibliographic fields from part (used in Faculty Research collection)
    removeElement(doc, CUSTOM_ELEMENTS.NUMBER_B, XPATH_CONTEXTS.PART)
    removeElement(doc, CUSTOM_ELEMENTS.NUMBER_C, XPATH_CONTEXTS.PART)
    removeElement(doc, CUSTOM_ELEMENTS.NUMBER_D, XPATH_CONTEXTS.PART)

    // Remove classification elements that only contain classificationType (non-standard subelement)
    removeEmptyClassifications(doc)

    // Convert authority-specific topic elements
    convertAuthorityElement(doc, 'topicCONA', ELEMENT_NAMES.TOPIC, 'cona')

    // Move form elements from physicalDescription to genre
    moveAndRenameElement(doc, `${XPATH_CONTEXTS.PHYSICAL_DESCRIPTION}/${CUSTOM_ELEMENTS.FORM_BROAD}`, XPATH_CONTEXTS.MODS, ELEMENT_NAMES.GENRE)
    moveAndRenameElement(doc, `${XPATH_CONTEXTS.PHYSICAL_DESCRIPTION}/${CUSTOM_ELEMENTS.FORM_SPECIFIC}`, XPATH_CONTEXTS.MODS, ELEMENT_NAMES.GENRE)

    // Move notes from physicalDescriptionNote wrapper to physicalDescription
    moveAndRenameElement(doc, `${XPATH_CONTEXTS.PHYSICAL_DESCRIPTION_NOTE}/${ELEMENT_NAMES.NOTE}`, XPATH_CONTEXTS.PHYSICAL_DESCRIPTION, ELEMENT_NAMES.NOTE)

    // Fix case sensitivity
    renameElement(doc, CASE_FIXES.ORIGININFO.old, CASE_FIXES.ORIGININFO.new)
    renameElement(doc, CASE_FIXES.RELATEDITEM.old, CASE_FIXES.RELATEDITEM.new)

    // Fix element names for MODS compliance
    // part/title -> part/text
    renameElement(doc, ELEMENT_NAMES.TITLE, ELEMENT_NAMES.TEXT, XPATH_CONTEXTS.PART)
    // part/number contains attachment UUIDs, convert to part/text with type="attachment-uuid"
    // When multiple numbers exist, create separate parts for additional UUIDs
    convertPartNumbers(doc)
    // Convert part/detail yes/no values for speaker release forms (Mudflats-specific)
    convertSpeakerReleaseDetail(doc)
    // part/extent -> part/extent/list (our use is not quite standard but this is an improvement)
    wrapTextWithChild(doc, `${XPATH_CONTEXTS.PART}/${ELEMENT_NAMES.EXTENT}`, ELEMENT_NAMES.LIST)

    // Convert namePartDate to namePart with type="date" attribute
    convertNamePartDate(doc)

    // Fix nonstandard subNameWrapper elements under mods/name
    convertSubNameWrapper(doc)

    // Convert local/archivesWrapper (series/subseries) to nested relatedItem structure
    convertArchivesWrapper(doc)

    // Remove usage="secondary" attribute from name elements
    removeBadNameUsageAttrs(doc)

    // Wrap copyInformation in holdingSimple under location
    wrapCopyInformation(doc)
    // Fix sublocation -> subLocation under location
    renameElement(doc, CASE_FIXES.SUBLOCATION.old, CASE_FIXES.SUBLOCATION.new, XPATH_CONTEXTS.COPY_INFORMATION)
    // Convert sublocationDetail to note (non-standard element)
    renameElement(doc, 'sublocationDetail', 'note', XPATH_CONTEXTS.COPY_INFORMATION)
    // Reorder copyInformation children to match schema sequence
    reorderCopyInformationChildren(doc)
    // Rename subLocationDetail to note
    renameElement(doc, 'subLocationDetail', 'note', XPATH_CONTEXTS.COPY_INFORMATION)

    // Wrap title elements that are direct children of relatedItem with titleInfo
    wrapElement(doc, XPATH_CONTEXTS.RELATEDITEM, ELEMENT_NAMES.TITLE, ELEMENT_NAMES.TITLE_INFO)

    // Wrap location text content with url or physicalLocation
    wrapLocationTextContent(doc)

    // Wrap language text content with languageTerm and move authority attribute
    wrapTextWithChild(doc, XPATH_CONTEXTS.LANGUAGE, ELEMENT_NAMES.LANGUAGE_TERM, [ATTRIBUTES.AUTHORITY])

    // Wrap originInfo/place text content with placeTerm
    wrapTextWithChild(doc, XPATH_CONTEXTS.ORIGININFO_PLACE, ELEMENT_NAMES.PLACE_TERM)

    // Wrap subject/name text content with namePart (preserves authority and type attributes on name)
    wrapTextWithChild(doc, XPATH_CONTEXTS.SUBJECT_NAME, ELEMENT_NAMES.NAME_PART)

    // Move classification elements to subject/topic
    moveClassificationToSubject(doc, CUSTOM_ELEMENTS.PHOTO_CLASSIFICATION, 'local')
    removeElement(doc, CUSTOM_ELEMENTS.PHOTO_CLASSIFICATION)  // Remove any remaining classification elements

    // Remove non-standard attributes
    removeAttribute(doc, XPATH_CONTEXTS.ACCESS_CONDITION, ATTRIBUTES.HREF)

    // Wrap recordInfo/languageOfCataloging with languageTerm and move authority attribute
    wrapTextWithChild(doc, `${XPATH_CONTEXTS.RECORD_INFO}/${ELEMENT_NAMES.LANGUAGE_OF_CATALOGING}`, ELEMENT_NAMES.LANGUAGE_TERM, [ATTRIBUTES.AUTHORITY])

    // Remove all empty elements (no text, no children with text)
    removeEmptyElements(doc)

    // Extract mods element and add namespace (for validation)
    const modsElements = safeSelect(XPATH_CONTEXTS.MODS, doc)
    if (modsElements.length > 0) {
        const modsElement = modsElements[0]

        // Add MODS namespace if not present (required for schema validation)
        if (!modsElement.getAttribute(ATTRIBUTES.XMLNS)) {
            modsElement.setAttribute(ATTRIBUTES.XMLNS, 'http://www.loc.gov/mods/v3')
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
