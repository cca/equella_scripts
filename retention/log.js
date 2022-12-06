import { DateTime } from 'luxon'

// prepend a formatted date to logged messages
function log () {
    console.log(DateTime.now().toISO(), ...arguments)
}

export default log
