const nodemailer = require('nodemailer')
const options = require('rc')('retention')

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
    let items_html = "<ul>"
    items_html += items.reduce((output, item) => {
        output += `<li><a href="${item.links.view}">${item.title}</a>`
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

    console.log(`Emailing ${username} about their ${items.length} items to be removed.`)

    transporter.sendMail(msg, (err, info) => {
        if (err) console.error(err)
        // @TODO don't need to log all this info
        console.log(info)
    })
}

function main() {
    if (!options.file) {
        throw Error("Error: must specify a JSON file of items.")
    }

    // @TODO we need a way to do this piecemeal rather than send out
    // thousands of emails at once, either by splitting up the input
    // files or having a limit parameter in this file
    const items = require(options.file)
    const itemsGroupedByOwner = groupByOwner(items)
    Object.keys(itemsGroupedByOwner).forEach(owner => {
        mailUser(owner, itemsGroupedByOwner[owner])
    })
}

exports.groupByOwner = groupByOwner

if (require.main === module) {
    main()
}
