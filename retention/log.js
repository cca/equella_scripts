const { DateTime } = require('luxon')

// prepend a formatted date to logged messages
function log () {
    console.log(DateTime.now().toISO(), ...arguments)
}
module.exports = log
