// miscellaneous utilities which are pleasant abstractions over
// EQUELLA's APIs, saving some typing and reducing the likelihood
// of bugs.

// log msg with SCRIPT prefix so it's easy to find in logs
// can pass multiple strings which will be joined with spaces
function log () {
    // turns function arguments into an array
    var msg = Array.prototype.slice.call(arguments, 0)
    logger.log('SCRIPT: ' + msg.join(' '))
}

// get value from XML, coercing into a string
function xget (path) {
    return String(xml.get(path))
}

// set value in XML, but only if we pass a non-empty string
function xset (path, str) {
    if (str !== "") {
        xml.set(path, str)
    }
}
