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
            return output[item.owner.id].push(item)
        }
        output[item.owner.id] = [item]
    })
    return output
}

function mailUser(username, items) {
    // @TODO we will have to skip UUID users somewhere...
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
        html: `<p>Hello,</p><p>[ insert VAULT retention info here ].</p><p>List of items:</p>${items_html}`
    }

    if (options.verbose || options.v) {
        console.log(`Emailing ${username} about their ${items.length} items to be removed.`)
    }

    return transporter.sendMail(msg)
}

async function main() {
    if (!options.file) {
        throw Error("Error: must specify a JSON file of items.")
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
