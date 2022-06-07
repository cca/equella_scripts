/**
 * pause execution for N milliseconds
 *
 * @param   {Number}  ms  number of milliseconds to pause
 *
 * @return  {Promise}     promise that will be resolved after the given time
 */
module.exports = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}
