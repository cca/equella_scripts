import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import nodemailer from 'nodemailer'
import rc from 'rc'

import Item from './item.js'
import sleep from './sleep.js'
import {debug, default as log} from './log.js'

let options = rc('retention')

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
export function groupByOwner(items) {
    let output = {}
    items.forEach(item => {
        if (!item.owner) log('Error, item has no owner object', item)
        // some items have owner {id: ""} (because the account was deleted)
        // https://vault.cca.edu/items/0729ca6a-7469-480e-82aa-8facc1e7e2aa/1/
        if (item.owner.id === "") {
            if (options.verbose || options.v) {
                debug(options.debug, item.links.view, 'has no owner, no email will be sent.')
            }
            return null
        }
        if (Object.prototype.hasOwnProperty.call(output, item.owner.id)) {
            return output[item.owner.id].push(item)
        } else {
            output[item.owner.id] = [item]
        }
    })
    return output
}

/**
 * Email a user the list of their items to be removed.
 *
 * @param   {String}  username
 * @param   {Item[]}  items     items to be removed
 *
 * @return  {Promise|String}   Promise from nodemailer or String message if no mail was sent
 *
 */
export function mailUser(username, items) {
    // reasons to skip items: internal user, no username, no live items
    if (items[0].internalOwner) {
        return `Skipping ${items.length} items owned by internal user with UUID ${username}.`
    }
    if (username.trim() === "") {
        return `Empty username for ${items.length} items; skipping email.`
    }
    if (!items.some(i => i.status === 'live')) {
        return `Skipping ${username} - none of their items to be removed are published.`
    }

    // determine the user's email address
    let email = null
    const user = global.homeEmails.find(e => e.Username === username)
    email = user ? user['Primary Home Email Address'] : `${username}@cca.edu`

    let items_html = items.reduce((accumulator, item) => {
        accumulator += `<li><a href="${item.links.view}">${item.title}</a>`
        return accumulator
    }, '<ul>')
    items_html += '</ul>'

    // Gmail shows the "from" address as the logged in user
    let msg = {
        from: "vault@cca.edu",
        replyTo: "vault@cca.edu",
        to: email,
        subject: "Items will be removed from CCA VAULT in 6 months",
        html: `<p>Hello,</p>
        <p>You own items that will be removed from VAULT, CCA's digital archive, in six months. If you want to retain your works, you can <a href="https://portal.cca.edu/knowledge-base/vault/how-to-download-vault-items/">learn how to download them here</a>. Note that items can only be downloaded one at a time. We apologize for any inconvenience.</p>
        <p>List of items to be removed:</p>${items_html}
        <p>You can access all your VAULT contributions, including unfinished drafts and superceded "archive" versions, on the <b><a href="https://vault.cca.edu/logon.do?.page=access/myresources.do">My Resources</a></b> page.</p>
        <p>For more information about this process, read <a href="https://portal.cca.edu/essentials/technology-services/web-services/vault/vault-retention-policy/">the VAULT retention policy</a> on Portal.</p>
        <p>Sincerely,<br>CCA Libraries<br>https://libraries.cca.edu&nbsp;|&nbsp;vault@cca.edu</p>
        <p><img height="48px" width="197px" src="https://www.cca.edu/sites/default/files/images/cca-logotype-394.png" style="border:0px;vertical-align:middle"></p>
        <p>145 Hooper Street | San Francisco, CA | 94107</p><p><i>CCA is located in Huichin and Yelamu, also known as San Francisco, on the unceded territories of Chochenyo and Ramaytush Ohlone peoples.</i></p>`
    }

    if (options.verbose || options.v) {
        log(`Emailing ${username} about their ${items.length} live items to be removed.`)
    }

    return transporter.sendMail(msg)
}

async function main(itemsFile, homeEmailsFile) {
    if (!itemsFile) {
        console.error('Error: please supply a file of items with the --file or -f flag.')
        process.exit(1)
    }
    if (!homeEmailsFile) {
        console.error('Error: please supply a JSON map of home emails with the --home-emails or --emails or -e flag.')
        process.exit(1)
    }
    global.homeEmails = JSON.parse(fs.readFileSync(homeEmailsFile, { encoding: 'utf-8' }))

    let items = JSON.parse(fs.readFileSync(itemsFile, { encoding: 'utf-8' }))
    if (Array.isArray(items)) {
        // are the items already grouped by owner?
        if (Array.isArray(items[0])) {
            log(`Emailing the ${items.length} owners of items in file ${itemsFile}`)
            for (const ownedItems of items) {
                let result = await mailUser(ownedItems[0]['owner']['id'], ownedItems.map(i => new Item(i, options)))
                debug(options.debug, result)
                await sleep(2000)
            }
        } else {
            log(`Emailing the owners of the ${items.length} items in file ${itemsFile}`)
            items = items.map(i => new Item(i, options))
            const itemsGroupedByOwner = groupByOwner(items)
            const owners = Object.keys(itemsGroupedByOwner)
            for (const owner of owners) {
                let result = await mailUser(owner, itemsGroupedByOwner[owner])
                debug(options.debug, result)
                await sleep(2000)
            }
        }
    } else {
        // just a single item, typically for testing so we log the result
        let result = await mailUser(items.owner.id, [new Item(items, options)])
        log(result)
    }
}

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    if (options.h || options.help) {
        console.log(`Usage: node ${path.basename(process.argv[1])} --file items.json --emails emails.json\n`)
        console.log('Where items.json is a file of items to be removed (can be batched by owner or not) and emails.json is a JSON map of home emails converted from the Graduated Student Home Emails report in Workday. Both files are required. Also relies on email configuration in .retentionrc; see the retention readme for complete details.\n')
        console.log('Options:\n\t--debug: show debug messages')
        process.exit(0)
    }

    const itemsFile = options.file || options.f
    const homeEmailsFile = options['home-emails'] || options.emails || options.e
    global.homeEmails = []
    main(itemsFile, homeEmailsFile).catch(e => console.error(e)).finally(() => {
        const basename = path.basename(itemsFile)
            , new_name = itemsFile.replace(basename, `x${basename}`);
        fs.rename(itemsFile, new_name, (err) => {
            if (err) throw err
            log(`Renamed ${itemsFile} to ${new_name}`)
        })
    })
}
