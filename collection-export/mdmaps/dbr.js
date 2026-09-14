import {DOMParser as xmldom} from '@xmldom/xmldom'
import {addArchivesSeries} from './xml-helpers.js'
import {toStrictMODS} from './strict-mods.js'

/**
 * Convert Design Book Review records to standard MODS, the only additional modification
 * this function does beyond toStrictMODS is adding the College Publications archives series.
 *
 * @param {string} xmlString - XML string to convert
 * @returns {Document} Converted MODS XML document ready for validation
 * @throws {Error} If XML is malformed, cannot be parsed, or input is invalid (via toStrictMODS)
 */
export function convertDBRtoMODS(xmlString) {
    const parser = new xmldom()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const strictMODS = toStrictMODS(doc.toString())
    // Add the College Publications archives series
    addArchivesSeries(strictMODS, 'VIII. Periodicals and Other Publications', '1. College Publications')
    return strictMODS
}
