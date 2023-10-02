import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import nodemailer from 'nodemailer'
import rc from 'rc'

import Item from './item.js'
import sleep from './sleep.js'
import log from './log.js'

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
                log(item.links.view, 'has no owner, no email will be sent.')
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
 * @return  {Promise|Boolean}   Promise from nodemailer or False if no mail was sent
 *
 */
export function mailUser(username, items) {
    // skip internal users, no need to email them
    if (items[0].internalOwner) {
        return `Skipping ${items.length} items owned by internal user with UUID ${username}.`
    }

    if (username.trim() == "") {
        return `Empty username for ${items.length} items; skipping email.`
    }

    items = items.filter(i => i.status === 'live')
    if (items.length === 0) {
        return `Skipping ${username} - none of their items to be removed are published.`
    }
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

async function main(file) {
    if (!file) {
        console.error('Error: please supply a file of items to delete with the --file or -f flag.')
        process.exit(1)
    }

    let items = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }))
    if (Array.isArray(items)) {
        // are the items already grouped by owner?
        if (Array.isArray(items[0])) {
            log(`Emailing the ${items.length} owners of items in file ${file}`)
            for (const ownedItems of items) {
                let result = await mailUser(ownedItems[0]['owner']['id'], ownedItems.map(i => new Item(i, options)))
                log(result)
                await sleep(2000)
            }
        } else {
            log(`Emailing the owners of the ${items.length} items in file ${file}`)
            items = items.map(i => new Item(i, options))
            const itemsGroupedByOwner = groupByOwner(items)
            const owners = Object.keys(itemsGroupedByOwner)
            for (const owner of owners) {
                let result = await mailUser(owner, itemsGroupedByOwner[owner])
                log(result)
                await sleep(2000)
            }
        }
    } else {
        // just a single item, typically for testing
        let result = await mailUser(items.owner.id, [new Item(items, options)])
        log(result)
    }
}

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    const items_file = options.file || options.f
    main(items_file).catch(e => console.error(e)).finally(() => {
        const basename = path.basename(items_file)
            , new_name = items_file.replace(basename, `x${basename}`);
        fs.rename(items_file, new_name, (err) => {
            if (err) throw err
            log(`Renamed ${items_file} to ${new_name}`)
        })
    })
}
