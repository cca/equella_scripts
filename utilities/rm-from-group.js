#!/usr/bin/env node
import fetch from 'node-fetch'
import rc from 'rc'

let options = rc('equella', {})

if (options.help || options.h) {
    console.log('usage: node rm-from-group --group UUID --user USER')

    console.log('\n\tremove user from an internal VAULT group')

    console.log('\n\tYou can find a group\'s UUID in the VAULT admin console or with equella-cli')
    console.log('\te.g. try running "eq group --name $GROUP_NAME" & finding the ID in the result.')
    console.log('\tTry: node rm-from-group --group (eq group --name NAME | jq -r .id) --user USER')

    console.log('\n\tTo remove internal users, use their UUID. To remove LDAP users, use their username.')
    process.exit(0)
}

const headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}
const url = `https://vault.cca.edu/api/usermanagement/local/group/${options.group}`
const fetch_options = { headers: headers, json: true }

if (!options.group || !options.user) {
    console.error('Must provide a group UUID _and_ a username. See --help for usage info.')
    process.exit(1)
}

function handleError(e) { if (e) throw e }

fetch(url, fetch_options).then(r => r.json())
    .then(data => {
        let group = data
        // EQUELLA API errors return an object like this
        if (group.error) throw Error(`${group.code} ${group.error}: ${group.error_description}`)

        if (options.verbose) console.log('group: ', group)

        if (group.users.includes(options.user)) {
            let new_group = group
            new_group.users = new_group.users.filter(user => user != options.user)

            let fetch_options = {
                body: JSON.stringify(new_group),
                headers: headers,
                method: 'PUT',
            }
            fetch_options.headers['Content-Type'] = 'application/json'

            fetch(url, fetch_options).then(resp => {
                if (resp.status === 200) {
                    console.log(`Removed ${options.user} from "${group.name}"`)
                    process.exit(0)
                } else {
                    console.log(`Problem removing ${options.user} from "${group.name}". HTTP Status: ${resp.status} ${resp.statusText}`)
                    process.exit(1)
                }
            }).catch(e => handleError(e))
        } else {
            console.log(`${options.user} was not in "${group.name}"`)
            process.exit(1)
        }
    }).catch(e => handleError(e))
