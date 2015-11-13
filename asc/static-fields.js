/*
 * these are basically static metadata that doesn't change
 * per item within a given collection. We *always* want to
 * record these values, so they can be placed in an Expert
 * Scripting Save Script.
 *
 * NOTE: the {{TEMPLATE}} fields in the first two variables
 * change from collection to collection. Fill those in with
 * the appropriate department, division, etc.
 */
// THESE FIELDS CHANGE BASED ON COLLECTION!
var dept = '{{DEPARTMENT}}',
    division = '{{DIVISION}}',
    ID = item.getUuid();

xml.set('/mods/language/@authority', 'iso639-2b');
xml.set('/mods/accessCondition/@type', 'use and reproduction');
xml.set('/mods/recordInfo/recordContentSource', 'cc9');
xml.set('/mods/recordInfo/recordContentSource/@authority', 'oclc');
xml.set('/mods/recordInfo/recordIdentifier', ID);
xml.set('/mods/recordInfo/languageOfCataloging', 'eng');
xml.set('/mods/accessCondition', 'For rights relating to this resource, please contact the CCA ' + dept + ' Program');
xml.set('/local/division', division);
//local/department uses natural language for dept
xml.set('/local/department', '' + dept);
