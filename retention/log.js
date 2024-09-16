import { DateTime } from 'luxon'

// prepend a formatted date to logged messages
export default function log () {
    console.log(DateTime.now().toISO(), ...arguments)
}

// log but only if options.debug is true
export function debug(debug_option) {
    if (debug_option) log(...Array.from(arguments).slice(1))
}
