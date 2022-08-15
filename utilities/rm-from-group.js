#!/usr/bin/env node
const request = require('request')

let options = require('rc')('equella', {})

if (options.help || options.h) {
    console.log('usage: node rm-from-group --group UUID --user USER')

    console.log('\n\tremove user from an internal VAULT group')

    console.log('\n\tYou can find a group\'s UUID in the VAULT admin console or with equella-cli')
    console.log('\te.g. try running "eq group --name $GROUP_NAME" & finding the ID in the result.')
    console.log('\tTry: node rm-from-group --group (eq group --name NAME | jq -r .id) --user USER')

    console.log('\n\tTo remove internal users, use their UUID. To remove LDAP users, use their username.')
    process.exit(0)
}

let headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}
let url = `https://vault.cca.edu/api/usermanagement/local/group/${options.group}`
let req_options = { headers: headers, json: true, url: url }
let http = request.defaults(req_options)

if (!options.group || !options.user) {
    console.error('Must provide a group UUID _and_ a username. See --help for usage info.')
    process.exit(1)
}

function handleError(e) { if (e) throw e }

http.get({}, (err, resp) => {
    handleError(err)

    let group = resp.body

    if (options.verbose) console.log('group: ', group)

    if (group.users.includes(options.user)) {
        let new_group = group
        new_group.users = new_group.users.filter(user => user != options.user)

        http.put({ json: new_group }, (err, resp) => {
            handleError(err)
            if (resp.statusCode === 200) {
                console.log(`Removed ${options.user} from "${group.name}"`)
                process.exit(0)
            } else {
                console.log(`Problem removing ${options.user} from "${group.name}". HTTP Status: ${resp.statusCode} ${resp.statusMessage}`)
                process.exit(1)
            }
        })
    } else {
        console.log(`${options.user} was not in "${group.name}"`)
        console.log('Exiting without doing anything.')
        process.exit(1)
    }
})
