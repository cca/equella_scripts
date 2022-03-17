/**
 * Return the date six years ago if not given a date
 *
 * @param   {String|Null}  date  in YYYY-MM-DD format
 *
 * @throws  {Error}         if date value is not in YYYY-MM-DD format
 *
 * @return  {String}        date six years ago if input was null
 */
module.exports = (date) => {
    if (!date) {
        let d = new Date()
        d.setYear(d.getFullYear() - 6)
        return d.toISOString().substring(0, 10)
    } else if (!date.match(/\d{4}-\d{2}-\d{2}/)) {
        throw Error('date value in .retentionrc is not in ISO 8601 (YYYY-MM-DD) format.')
    }
    return date
}
