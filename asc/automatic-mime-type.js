/* global attachments,xml */
/* use oE's mime object to record the MIME types of attachments
used in Libraries collection Expert Save Script */
// returns iterator, not array
var files = attachments.list()
var len = files.size()
// MODS MIME type element
var xp = '/mods/physicalDescription/internetMediaType'

// delete all previous MIME type info
xml.deleteAll(xp)

for (var i = 0; i < len; i++) {
    var file = files.get(i)
    var filename = String(file.getFilename())
    // https://openequella.github.io/api-docs/Script/api/com/tle/web/scripting/advanced/objects/MimeScriptObject.html
    // returns "null if the mime type could not be determined"
    var mimeObject = mime.getMimeTypeForFilename(filename)

    if (mimeObject) {
        // https://openequella.github.io/api-docs/Script/api/com/tle/web/scripting/advanced/types/MimeTypeScriptType.html
        xml.add(xp, mimeObject.getType())
    }
}
