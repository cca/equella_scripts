import xpath from 'xpath'

/**
 * Helper utilities for strict-mods.js transformations
 * Reduces code duplication and improves maintainability
 */

/**
 * Safely select elements using XPath, filtering out elements without parents
 * This prevents null-pointer errors and provides consistent behavior across transformations
 *
 * @param {string} xpathExpression - XPath expression to select elements
 * @param {Document|Element} context - DOM context to search within
 * @param {Object} [namespaces={}] - Optional namespace mapping
 * @returns {Element[]} Array of elements with valid parents
 */
export function safeSelect(xpathExpression, context, namespaces = {}) {
    if (!context) return []
    const select = xpath.useNamespaces(namespaces)
    const elements = select(xpathExpression, context)
    // Filter out elements without parents upfront to avoid null checks in loops
    return Array.from(elements).filter(el => el && el.parentNode)
}

/**
 * Like safeSelect but returns only the first element with a valid parent
 *
 * @param {string} xpathExpression - XPath expression to select elements
 * @param {Document|Element} context - DOM context to search within
 * @param {Object} [namespaces={}] - Optional namespace mapping
 * @returns {Element|null} First element with a valid parent, or null if none found
 */
export function safeSelectFirst(xpathExpression, context, namespaces = {}) {
    if (!context) return null
    const select = xpath.useNamespaces(namespaces)
    const elements = select(xpathExpression, context)
    // Filter out elements without parents upfront to avoid null checks in loops
    const filtered = Array.from(elements).filter(el => el && el.parentNode)
    return filtered.length > 0 ? filtered[0] : null
}

/**
 * Copy all attributes from source element to target element
 * Optionally skip certain attribute names
 *
 * @param {Element} sourceElement - Element to copy attributes from
 * @param {Element} targetElement - Element to copy attributes to
 * @param {string[]} [skipAttributes=[]] - Array of attribute names to skip
 */
export function copyAttributes(sourceElement, targetElement, skipAttributes = []) {
    if (!sourceElement || !targetElement || !sourceElement.attributes) {
        return
    }

    for (let i = 0; i < sourceElement.attributes.length; i++) {
        const attr = sourceElement.attributes[i]
        if (!skipAttributes.includes(attr.name)) {
            targetElement.setAttribute(attr.name, attr.value)
        }
    }
}

/**
 * Move all child nodes from source element to target element
 * If beforeNode is specified, inserts children before that node
 *
 * @param {Element} sourceElement - Element to move children from
 * @param {Element} targetElement - Element to move children to
 * @param {Node} [beforeNode=null] - Optional node to insert before
 */
export function moveChildren(sourceElement, targetElement, beforeNode = null) {
    if (!sourceElement || !targetElement) {
        return
    }

    while (sourceElement.firstChild) {
        if (beforeNode) {
            targetElement.insertBefore(sourceElement.firstChild, beforeNode)
        } else {
            targetElement.appendChild(sourceElement.firstChild)
        }
    }
}

/**
 * Check if element has only whitespace text content (or is empty)
 *
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is empty or whitespace-only
 */
export function isEmptyOrWhitespace(element) {
    if (!element || !element.textContent) {
        return true
    }
    return element.textContent.trim() === ''
}

/**
 * Generic transformation function that moves and optionally renames elements
 * Consolidates logic from moveClassificationToSubject and moveAndRenameElement
 *
 * @param {Document} doc - XML DOM document
 * @param {string} sourcePath - XPath to source elements
 * @param {string} targetParentPath - XPath to target parent element
 * @param {string} newElementName - Name for the moved element
 * @param {Object} [options={}] - Transformation options
 * @param {string} [options.wrapperElement] - Optional wrapper element to create
 * @param {Object} [options.addAttributes={}] - Attributes to add to moved element
 * @param {boolean} [options.skipEmpty=true] - Skip elements with no text content
 * @returns {Document} Modified document
 */
export function moveAndTransformElement(doc, sourcePath, targetParentPath, newElementName, options = {}) {
    const {
        wrapperElement = null,
        addAttributes = {},
        skipEmpty = true,
    } = options

    if (!doc || !sourcePath || !targetParentPath || !newElementName) {
        return doc
    }

    const sourceElements = safeSelect(sourcePath, doc)
    const targetParents = safeSelect(targetParentPath, doc)

    if (targetParents.length === 0) {
        return doc
    }

    const targetParent = targetParents[0]

    for (let sourceElement of sourceElements) {
        // Skip empty elements if configured
        if (skipEmpty && isEmptyOrWhitespace(sourceElement)) {
            continue
        }

        // Create new element with new name
        const newElement = doc.createElement(newElementName)
        newElement.textContent = sourceElement.textContent

        // Copy original attributes
        copyAttributes(sourceElement, newElement)

        // Add new attributes (may override copied ones)
        for (const [name, value] of Object.entries(addAttributes)) {
            newElement.setAttribute(name, value)
        }

        // Wrap in container if specified
        let elementToAdd = newElement
        if (wrapperElement) {
            const wrapper = doc.createElement(wrapperElement)
            wrapper.appendChild(newElement)
            elementToAdd = wrapper
        }

        // Add to target parent
        targetParent.appendChild(elementToAdd)

        // Remove source element
        sourceElement.parentNode.removeChild(sourceElement)
    }

    return doc
}

/**
 * Create an element with text content and attributes
 * Helper to reduce boilerplate in transformations
 *
 * @param {Document} doc - XML DOM document
 * @param {string} elementName - Name of element to create
 * @param {string} [textContent=''] - Text content for the element
 * @param {Object} [attributes={}] - Attributes to set on element
 * @returns {Element} Created element
 */
export function createElement(doc, elementName, textContent = '', attributes = {}) {
    const element = doc.createElement(elementName)

    if (textContent) {
        element.textContent = textContent
    }

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value)
    }

    return element
}

/**
 * Check if an element is truly empty (no text, all children empty)
 * Used by removeEmptyElements - extracted for reusability
 *
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is completely empty
 */
export function isElementEmpty(element) {
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

    return true // No text, all children empty
}

/**
 * Check if an element has direct text node children with non-whitespace content
 * This is used to determine if an element needs text wrapping or has already been processed
 *
 * @param {Element} element - Element to check
 * @returns {boolean} True if element has direct text content (not in child elements)
 */
export function hasDirectTextContent(element) {
    if (!element || !element.childNodes) {
        return false
    }

    for (let node of element.childNodes) {
        if (node.nodeType === 3) { // TEXT_NODE
            if (node.nodeValue.trim()) {
                return true
            }
        }
    }

    return false
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
export function renameElement(doc, oldName, newName, xpathContext = '//mods', attributes = {}) {
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
 * Add a role/roleTerm child to a parent element assuming marcrelator authority.
 * Used by personalNames and corporateName functions in syllabus.js.
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
 * Standardize <mods> element: 1) ensure there is exactly 1 <mods> element
 * and 2) add the appropriate attributes
 * @param {Document} doc - The XML document containing the <mods> element
 * @returns {Element} The standardized <mods> element
 */
export function setupModsElement(doc) {
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
    mods.setAttribute("xmlns:xsi", 'http://www.w3.org/2001/XMLSchema-instance')
    mods.setAttribute("xsi:schemaLocation", 'http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-8.xsd')
    return mods
}
