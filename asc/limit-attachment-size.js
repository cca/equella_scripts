/*global attachments,xml,staging */
/**
 * filesize.js
 *
 * Server-side JS to limit the size of an attachment.
 * Meant to be inserted into a contribution Wizard as
 * an on-submit script that runs immediately after an
 * attachment control.
 */

// set the threshold below to an appropriate cutoff
// file size is recorded in bytes
var threshold = 300000000, // 300mb
    // initialize variables used in loop
    size, current, i, filename,
    // returns an iterator, not an array
    files = attachments.list(),
    // number of attachments
    // .size() method not to be confused with file size
    numFiles = files.size(),
    removedFiles = [];

for ( i = 0; i < numFiles; i++ ) {
    // get the size (in bytes) of an attachment
    current = files.get(i);
    size = current.getSize();


    if (size > threshold) {
        //
        filename = current.getFilename();
        attachments.remove(current);
        // From Scripting API documentation of .remove() method: "Removes an attachment
        // from the item. If the attachment is a physical file, it does not delete the
        // file from the file system. Use FileScriptingObject.deleteFile(String) to delete
        // the actual file."
        // staging below is the interface to FileScriptingObject
        staging.deleteFile(filename);
        // record that we deleted a file
        removedFiles.push(filename);
    }
}

if ( removedFiles.length > 0 ) {
    xml.set('removed', removedFiles.join(', '));
}
