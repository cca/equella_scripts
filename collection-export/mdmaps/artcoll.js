import {DOMParser as xmldom} from '@xmldom/xmldom'
import {addArchivesSeries} from './xml-helpers.js'
import {toStrictMODS} from './strict-mods.js'

/**
 * Convert Art Collection records to standard MODS, the only additional modification
 * this function does beyond toStrictMODS is adding an archives series.
 *
 * @param {string} xmlString - XML string to convert
 * @returns {Document} Converted MODS XML document ready for validation
 * @throws {Error} If XML is malformed, cannot be parsed, or input is invalid (via toStrictMODS)
 */
export function convertArtCollectiontoMODS(xmlString) {
    const parser = new xmldom()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const strictMODS = toStrictMODS(doc.toString())
    // Add the Art Collection archives series
    addArchivesSeries(strictMODS, 'V. Exhibits and the CCA Art Collection', '1. Collection and Administration')
    return strictMODS
}
