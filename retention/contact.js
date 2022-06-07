const fs = require('fs')
const nodemailer = require('nodemailer')
let options = require('rc')('retention')
const Item = require('./item')
const log = require('./log')

// tests run from root with a different rc file
// so if we're testing, we load the test configuration
if (options._[0] === 'retention/test') {
    options = JSON.parse(fs.readFileSync('.testretentionrc'))
}

// https://nodemailer.com/transports/stream/ for testing
let transporter = nodemailer.createTransport({ jsonTransport: true })
if (options.transporter == 'mailgun') {
    // https://app.mailgun.com/app/sending/domains/sandboxf71b89c221c948118ac2542dd1bc019d.mailgun.org
    transporter = nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        // ran into an SSL error when sending emails via test domain
        secure: false,
        auth: {
            user: options.smtp_user,
            pass: options.smtp_pass
        }
    })
} else if (options.transporter == 'google' || options.transporter == 'gmail') {
    // see https://nodemailer.com/usage/using-gmail/
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: options.smtp_user,
            pass: options.smtp_pass
        }
    })
}

/**
 * Return items in an { owner: [list of their items...]} hash
 *
 * @param   {Item[]}  items
 *
 * @return  {Object}         owners mapped to an array of their items
 * i.e. { "me": [Item1, Item2], "you": [Item3] }
 */
function groupByOwner(items) {
    let output = {}
    items.forEach(item => {
        if (Object.prototype.hasOwnProperty.call(output, item.owner.id)) {
            // some items have no owner (because the account was deleted)
            // https://vault.cca.edu/items/0729ca6a-7469-480e-82aa-8facc1e7e2aa/1/
            if (item.owner.id.trim() === "") {
                if (options.verbose || options.v) {
                    log(item.links.view)
                    log('Item has no owner, no notification email will be sent.')
                }
                return null
            }
            return output[item.owner.id].push(item)
        }
        output[item.owner.id] = [item]
    })
    return output
}

/**
 * Email a user the list of their items to be removed.
 *
 * @param   {String}  username
 * @param   {Item[]}  items     items to be removed
 *
 * @return  {Promise|Boolean}   Promise from nodemailer or False if no mail was sent
 *
 */
function mailUser(username, items) {
    // skip internal users, no need to email them
    if (items[0].internalOwner) {
        log(`Skipping internal user with UUID ${username}`)
        log(`They own ${items.length} items`)
        return false
    }

    if (username.trim() == "") {
        log(`Empty username for ${items.length} items; skipping email`)
        return false
    }

    items = items.filter(i => i.status === 'live')
    let items_html = '<ul>'
    items_html += items.reduce((accumulator, item) => {
        accumulator += `<li><a href="${item.links.view}">${item.title}</a>`
        return accumulator
    }, '')
    items_html += '</ul>'

    // Gmail will show the "from" address as the logged in user
    let msg = {
        from: "vault@cca.edu",
        replyTo: "vault@cca.edu",
        to: `${username}@cca.edu`,
        subject: "Items will be removed from CCA VAULT in 6 months",
        html: `<p>Hello,</p>
        <p>You own items that will be removed from VAULT, CCA's digital archive, in six months. If you want to retain your works, you can <a href="https://portal.cca.edu/essentials/technology-services/web-services/vault/how-to-download-vault-items/">learn how to download them here</a>. Note that items can only be downloaded one at a time. We apologize for any inconvenience.</p>
        <p>List of items to be removed:</p>${items_html}
        <p>You can access all your VAULT contributions, including unfinished drafts and superceded "archive" versions, on the <b><a href="https://vault.cca.edu/logon.do?.page=access/myresources.do">My Resources</a></b> page.</p>
        <p>For more information about this process, read <a href="https://portal.cca.edu/essentials/technology-services/web-services/vault/vault-retention-policy/">the VAULT retention policy</a> on Portal.</p>
        <p>Sincerely,<br>CCA Libraries<br>https://libraries.cca.edu&nbsp;|&nbsp;vault@cca.edu</p>
        <p><img height="48px" width="197px" src="https://www.cca.edu/sites/default/files/images/cca-logotype-394.png" style="border:0px;vertical-align:middle"></p>
        <p>1111 8th St | San Francisco, CA | 94107</p><p><i>CCA is situated on the traditional unceded lands of the Ohlone peoples.</i></p>`
    }

    if (options.verbose || options.v) {
        log(`Emailing ${username} about their ${items.length} live items to be removed.`)
    }

    return transporter.sendMail(msg)
}

async function main() {
    let items_file = options.file || options.f
    if (!items_file) {
        console.error('Error: please supply a file of items to delete with the --file or -f flag.')
        process.exit(1)
    }

    let items = JSON.parse(fs.readFileSync(items_file, { encoding: 'utf-8' }))
    if (Array.isArray(items)) {
        // are the items already grouped by owner?
        if (Array.isArray(items[0])) {
            log(`Emailing the ${items.length} owners of items in file ${items_file}`)
            items.forEach(async ownedItems => {
                let result = await mailUser(ownedItems[0]['owner']['id'], ownedItems.map(i => new Item(i, options)))
                if (result) log(result)
            })
        } else {
            log(`Emailing the owners of the ${items.length} items in file ${items_file}`)
            items = items.map(i => new Item(i, options))
            let itemsGroupedByOwner = groupByOwner(items)
            Object.keys(itemsGroupedByOwner).forEach(async owner => {
                let result = await mailUser(owner, itemsGroupedByOwner[owner])
                if (result) log(result)
            })
        }
    } else {
        // just a single item, typically for testing
        let result = await mailUser(items.owner.id, [new Item(items, options)])
        if (result) log(result)
    }
}

exports.groupByOwner = groupByOwner
exports.mailUser = mailUser

if (require.main === module) {
    main().catch(e => { throw e })
}
