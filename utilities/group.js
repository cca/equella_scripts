#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'

import { default as fetch, Headers } from 'node-fetch'
import rc from 'rc'

let options = rc('equella', {})

function usage(exitCode=0) {
    console.log('usage: node group [ add | rm ] [ --uuid | --name ] GROUP --users USERS [ --debug ]')

    console.log('\nAdd or remove user(s) from an internal VAULT group. Must specify either "add" or')
    console.log('"rm" and must identify a group with either a --uuid or --name.')

    console.log('\n\t--uuid: group UUID')
    console.log('\t--name: group name (case insensitive)')
    console.log('\t--users: comma-separated list of users or path to a JSON file containing an array of usernames')
    console.log('\t--debug: print more info & complete group JSON before/after modification')

    console.log('\nTo remove internal users, use their UUID. To remove LDAP users, use their username.')
    process.exit(exitCode)
}

if (options.help || options.h) usage()

/**
 * Internal Group
 * This class is not used, it's just to get type annotations elsewhere.
 */
class Group {
    constructor (g) {
        /* @type {str} */
        this.id = g.id
        /* @type {string} */
        this.name = g.name
        /* @type {Array} */
        this.users = g.users
        /* @type {Object} */
        this.links = g.links
    }
}

const headers = new Headers({
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
})
const fetch_options = { headers: headers }
const url = `${options.root}/api/usermanagement/local/group/`

function debug() {
    if (options.debug) console.log(...arguments)
}
// EQUELLA API errors return an object like this
function equellaError(obj) {
    if (obj.error) throw Error(`${obj.code} ${obj.error}: ${obj.error_description}`)
}
async function fetchJSONOrThrow(url, options) {
    const response = await fetch(url, options)
    const data = await response.json()
    equellaError(data)
    return data
}

/**
 * given UUID, return Group
 *
 * @param   {str}  group uuid
 *
 * @return  {Group}
 */
export async function getGroupByUUID(uuid) {
    debug(`Looking up group by UUID ${uuid}`)
    let group = await fetchJSONOrThrow(url + uuid, fetch_options)
    debug(group)
    return group
}

/**
 * given name, return Group
 *
 * @param   {str}  group name
 *
 * @return  {Group}
 */
export async function getGroupByName(name) {
    debug(`Looking up group by name ${name}`)
    let data = await fetchJSONOrThrow(url, fetch_options)
    if (data.results) {
        let group = data.results.find(g => {
            return g.name.toLowerCase() === name.toLowerCase()
        })
        if (!group) {
            console.error(`Error: unable to find a group with the name "${name}".`)
            process.exit(1)
        }
        group = await getGroupByUUID(group.id)
        return group
    } else {
        console.error(`Error: unable to find group with name "${name}"`)
        process.exit(1)
    }
}

/**
 * get users from command line parameter
 *
 * @param   {Path|str}  users
 * Either the Path to a JSON file of users or a comma-separated string of users
 *
 * @return  {Array[str]}         array of username strings
 */
export async function getUsers(users) {
    if (users.match(/\.json$/)) {
        // users.json file
        let data = await fs.readFile(users, 'utf8')
        return JSON.parse(data)
    } else {
        // comma-separated string 'user1,user2'
        return users.split(',')
    }
}

/**
 * modify group with provided Group object
 *
 * @param   {Group}  group
 * @param   {str}  successMsg   message to log on success
 *
 * @return  {Promise}           promise from fetch
 */
function modifyGroup(group, successMsg) {
    let put_opts = fetch_options
    put_opts.headers.append('Content-Type', 'application/json')
    put_opts["method"] = 'PUT'
    put_opts["body"] = JSON.stringify(group)
    return fetch(url + group.id, put_opts).then(resp => {
        if (!resp.ok) {
            console.error(`HTTP Error: ${resp.status} ${resp.statusText}`)
        } else {
            console.log(successMsg)
        }
    })
}

/**
 * add users to group
 *
 * @param   {Array}  users
 * @param   {Group}  group
 *
 * @return  {Promise|undefined}   promise from modifyGroup()
 */
export function addUsersToGroup(users, group) {
    let new_group = group
    let changes = false
    users.forEach(user => {
        if (!group.users.includes(user)) {
            new_group.users.push(user)
            changes = true
        } else {
            debug(`User ${user} was already in this group, skipping them`)
        }
    })

    if (!changes) return console.error(`No changes to make to group, exiting without doing anything.`)

    return modifyGroup(new_group, `Successfully added ${users.join(',')} to ${group.name}`)
}

/**
 * remove users from group
 *
 * @param   {Array}  users
 * @param   {Group}  group
 *
 * @return  {Promise|undefined}   promise from modifyGroup()
 */
export function rmUsersFromGroup(users, group) {
    let new_group = group
    let changes = false
    users.forEach(user => {
        if (group.users.includes(user)) {
            new_group.users = new_group.users.filter(u => u !== user)
            changes = true
        } else {
            debug(`User ${user} was not in this group, skipping them`)
        }
    })

    if (!changes) return console.error(`No changes to make to group, exiting without doing anything.`)

    return modifyGroup(new_group, `Successfully removed ${users.join(',')} from ${group.name}`)
}

async function main() {
    let group, users, command = options._[0];
    if (options.uuid && options.name) {
        console.error('Error: invoked with both a group name and UUID; use only one or the other.\n')
        usage(1)
    } else if (options.uuid ) {
        group = await getGroupByUUID(options.uuid)
    } else if (options.name) {
        group = await getGroupByName(options.name)
    } else {
        console.error('Error: no group name or UUID provided; please provide one or the other.\n')
        usage(1)
    }

    if (!options.users) {
        console.error(`Error: must specify a comma-separated list of users or the path to a JSON file with an array of users.\n`)
        usage(1)
    }
    users = await getUsers(options.users)

    switch (command) {
    case 'add':
        return addUsersToGroup(users, group)
    case 'rm':
        return rmUsersFromGroup(users, group)
    case 'remove':
        return rmUsersFromGroup(users, group)
    default:
        console.error(`Error: must specify either "add" or "remove" command.\n`)
        usage(1)
    }
}

if (import.meta.url.replace(/\.js$/, '') === pathToFileURL(process.argv[1]).href.replace(/\.js$/, '')) {
    main()
}
