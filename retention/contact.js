const fs = require('fs')
const nodemailer = require('nodemailer')
let options = require('rc')('retention')
const Item = require('./item')

// tests run from root with a different rc file
// so if we're testing, we load the test configuration
if (options._[0] === 'retention/test') {
    options = JSON.parse(fs.readFileSync('.testretentionrc'))
}

// see https://nodemailer.com/usage/using-gmail/
// @TODO we probably want to use Mailgun instead of Gmail
// https://app.mailgun.com/app/sending/domains/sandboxf71b89c221c948118ac2542dd1bc019d.mailgun.org
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: options.smtp_user,
        pass: options.smtp_pass
    }
})

function groupByOwner(items) {
    let output = {}
    items.forEach(item => {
        if (Object.prototype.hasOwnProperty.call(output, item.owner.id)) {
            // some items have no owner (because the account was deleted)
            // https://vault.cca.edu/items/0729ca6a-7469-480e-82aa-8facc1e7e2aa/1/
            if (item.owner.id.trim() === "") {
                if (options.verbose || options.v) {
                    console.log(`Item ${item.links.view} has no owner, no notification email will be sent.`)
                }
                return null
            }
            return output[item.owner.id].push(item)
        }
        output[item.owner.id] = [item]
    })
    return output
}

function mailUser(username, items) {
    // skip internal users, no need to email them
    if (items[0].internalOwner) {
        console.log(`Skipping internal user with UUID ${username}`)
        return false
    }

    let items_html = "<ul>"
    items_html += items.reduce((accumulator, item) => {
        accumulator += `<li><a href="${item.links.view}">${item.title}</a>`
        return accumulator
    }, '')
    items_html += "</ul>"

    // Gmail will show the "from" address as the logged in user
    let msg = {
        from: "vault@cca.edu",
        replyTo: "vault@cca.edu",
        to: `${username}@cca.edu`,
        subject: "VAULT Retention Test",
        html: `<p>Hello,</p>
        <p>You own items that will be removed from VAULT, CCA's digital archive, in six months. You can <a href="https://portal.cca.edu/essentials/technology-services/web-services/vault/how-to-download-vault-items/">learn how to download them here</a>. Note that items must be downloaded one-by-one, we apologize for any inconvenience this causes.</p>
        <p>List of items to be removed:</p>${items_html}
        <p>Sincerely,<br>CCA Libraries<br>https://libraries.cca.edu&nbsp;|&nbsp;vault@cca.edu</p>
        <p><img height="48px" width="197px" src="https://www.cca.edu/sites/default/files/images/cca-logotype-394.png" style="border:0px;vertical-align:middle"></p>
        <p>1111 8th St | San Francisco, CA | 94107</p><p><i>CCA is situated on the traditional unceded lands of the Ohlone peoples.</i></p>`
    }

    if (options.verbose || options.v) {
        console.log(`Emailing ${username} about their ${items.length} items to be removed.`)
    }

    return transporter.sendMail(msg)
}

async function main() {
    let items_file = options.file || options.f
    if (!items_file) {
        console.error('Error: please supply a file of items to delete with the --file or -f flag.')
        process.exit(1)
    }

    // @TODO we need a way to do this piecemeal rather than send out
    // thousands of emails at once, either by splitting up the input
    // files or having a limit parameter in this file
    let items = JSON.parse(fs.readFileSync(options.file, { encoding: 'utf-8' }))
    if (Array.isArray(items)) {
        items = items.map(i => new Item(i, options))
        let itemsGroupedByOwner = groupByOwner(items)
        Object.keys(itemsGroupedByOwner).forEach(async owner => {
            let result = await mailUser(owner, itemsGroupedByOwner[owner])
            console.log(result)
        })
    } else {
        // just a single item
        let result = await mailUser(items.owner.id, [new Item(items, options)])
        console.log(result)
    }
}

exports.groupByOwner = groupByOwner
exports.mailUser = mailUser

if (require.main === module) {
    main()
}
