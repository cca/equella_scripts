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
