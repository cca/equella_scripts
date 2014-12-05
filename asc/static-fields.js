/*
 * these are basically static metadata that doesn't change
 * per item within a given collection. We *always* want to
 * record these values, so they can be placed in an Expert
 * Scripting Save Script.
 *
 * NOTE: the {{TEMPLATE}} fields towards the end do change
 * from collection to collection. Fill those in with the
 * appropriate department, division, etc.
 */
xml.set ('/mods/language/@authority', 'iso639-2b');
xml.set ('/mods/accessCondition/@type', 'use and reproduction');
xml.set ('/mods/recordInfo/recordContentSource', 'cc9');
xml.set ('/mods/recordInfo/recordContentSource/@authority', 'oclc');
var ID = item.getUuid();
xml.set ('/mods/recordInfo/recordIdentifier', ID);
xml.set ('/mods/recordInfo/languageOfCataloging', 'eng');

// THESE FIELDS CHANGE BASED ON COLLECTION!
xml.set ('/mods/accessCondition', 'For rights relating to this resource, please contact the CCA {{DEPARTMENT}} Program');
xml.set('/local/division', '{{DIVISION}}');
//local/department uses natural language for dept
xml.set('/local/department', '{{DEPARTMENT}}');
