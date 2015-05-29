/* global attachments,xml */
/* an on-submit script to record the MIME types of attachments
in an item's metadata. Based purely off of filename extension, not
file's bytes. Incomplete listing of MIME types. */
// returns iterator, not array
var files = attachments.list()
var len = files.size()
// MODS MIME type element
var xp = '/mods/physicalDescription/internetMediaType'
// hash of file extensions to corresponding MIME types
// complete list: https://www.iana.org/assignments/media-types/media-types.xhtml
var mimes = {
    'doc': 'application/msword',
    'gif': 'image/gif',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'mp3': 'audio/mpeg3 ',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'png': 'image/png',
    'pdf': 'application/pdf',
    'tif': 'image/tiff',
    'tiff': 'image/tiff',
    'wav': 'audio/wav'
}

// delete all previous MIME type info
xml.deleteAll(xp)

for (var i = 0; i < len; i++) {
    var file = files.get(i)
    var filename = String(file.getFilename())
    var ext = filename.split('.').pop().toLowerCase()

    // do we have a MIME type for this file extension?
    if (mimes[ext]) {
        xml.add(xp, mimes[ext])
    }
}
